/**
 * Event-based DJ scraper: Scrapes EDMTrain for upcoming Chicago events,
 * extracts DJ names from schema.org markup, verifies SoundCloud profiles,
 * and populates the DB with real event-sourced performers + events.
 */
import { chromium, type Page, type Browser } from "playwright";
import { getSupabase, slugify, log, logError, isNonArtistName } from "./utils";

interface ScrapedEvent {
  date: string;
  artists: string[];
  venue: string;
  genres: string[];
  source: string;
  ticketUrl?: string;
}

// ─── EDMTrain Scraper ───
async function scrapeEdmTrain(page: Page): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];

  try {
    await page.goto("https://edmtrain.com/chicago-il", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    for (let i = 0; i < 10; i++) {
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitForTimeout(1200);
    }

    const rawEvents = await page.evaluate(`
      (() => {
        const results = [];
        const containers = document.querySelectorAll('.eventContainer');
        containers.forEach(c => {
          const sorteddate = c.getAttribute('sorteddate') || '';
          const venue = c.getAttribute('venue') || '';

          const performerEls = c.querySelectorAll('[itemprop="performer"]');
          const artists = [];
          performerEls.forEach(el => {
            const name = el.textContent?.trim();
            if (name && name.length > 1 && name.length < 60) artists.push(name);
          });

          if (artists.length === 0) {
            const titlestr = c.getAttribute('titlestr') || '';
            if (titlestr) {
              titlestr.split(/,/).forEach(a => {
                const parts = a.split(/\\s+b2b\\s+/i);
                parts.forEach(p => {
                  const clean = p.trim();
                  if (clean.length > 1 && clean.length < 60) artists.push(clean);
                });
              });
            }
          }

          const genreEls = c.querySelectorAll('.genre');
          const genres = [];
          genreEls.forEach(el => {
            const g = el.textContent?.trim().toLowerCase();
            if (g && g.length > 2) genres.push(g);
          });

          // Get event URL
          const linkEl = c.querySelector('a[itemprop="url"]');
          const eventUrl = linkEl?.getAttribute('href') || '';

          if (artists.length > 0 && sorteddate) {
            results.push({ date: sorteddate, artists, venue, genres, eventUrl });
          }
        });
        return results;
      })()
    `) as Array<{ date: string; artists: string[]; venue: string; genres: string[]; eventUrl: string }>;

    const now = new Date();
    const twoMonthsOut = new Date(now);
    twoMonthsOut.setMonth(twoMonthsOut.getMonth() + 2);

    for (const raw of rawEvents) {
      const eventDate = new Date(raw.date + "T00:00:00");
      if (eventDate < now || eventDate > twoMonthsOut) continue;

      events.push({
        date: raw.date,
        artists: raw.artists.map((a) => a.replace(/\s*\([^)]*\)\s*/g, "").trim()),
        venue: raw.venue,
        genres: raw.genres,
        source: "edmtrain",
        ticketUrl: raw.eventUrl || undefined,
      });
    }

    log("edmtrain", `${events.length} events, ${new Set(events.flatMap((e) => e.artists)).size} unique artists`);
  } catch (err) {
    logError("edmtrain", "Scrape failed", err);
  }

  return events;
}

// ─── SoundCloud Profile Verification ───
// SC returns 403 for headless but still sets the <title> tag, which proves the profile exists.
// We can use this to verify and construct embed URLs.
async function verifySoundCloud(
  page: Page,
  artistName: string
): Promise<{ url: string; verified: boolean } | null> {
  const slugGuesses = [
    artistName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    artistName.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    artistName.toLowerCase().replace(/\./g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  ];

  for (const guess of slugGuesses) {
    if (!guess || guess.length < 2) continue;
    try {
      const url = `https://soundcloud.com/${guess}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
      await page.waitForTimeout(1000);

      const finalUrl = page.url();
      if (finalUrl.includes("/feed") || finalUrl.includes("/signin")) continue;

      // Check title tag — SC sets it even on 403
      const title = await page.title();
      // Valid profile titles look like: "Stream artistname music | Listen to..."
      // 404 pages show: "SoundCloud - Hear the world's sounds"
      if (title.includes("Listen to") || title.includes("Stream")) {
        return { url, verified: true };
      }
    } catch {}
  }

  return null;
}

function parseFollowers(str: string): number {
  const cleaned = str.replace(/,/g, "").trim();
  const match = cleaned.match(/([\d.]+)\s*([KkMm])?/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  if (suffix === "K") return Math.round(num * 1000);
  if (suffix === "M") return Math.round(num * 1000000);
  return Math.round(num);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main Pipeline ───
async function main() {
  const supabase = getSupabase();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    });

    // ── Step 1: Scrape events ──
    log("main", "=== SCRAPING EVENTS ===");
    const scrapePage = await context.newPage();
    const allEvents = await scrapeEdmTrain(scrapePage);
    await scrapePage.close();

    if (allEvents.length === 0) {
      log("main", "No events found — aborting");
      return;
    }

    // ── Step 2: Deduplicate artist names ──
    const artistMap = new Map<
      string,
      { displayName: string; genres: Set<string>; eventCount: number; venues: Set<string> }
    >();

    for (const event of allEvents) {
      for (const artist of event.artists) {
        const key = artist.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key.length < 2) continue;

        if (!artistMap.has(key)) {
          artistMap.set(key, {
            displayName: artist,
            genres: new Set(),
            eventCount: 0,
            venues: new Set(),
          });
        }
        const entry = artistMap.get(key)!;
        entry.eventCount++;
        event.genres.forEach((g) => entry.genres.add(g));
        if (event.venue) entry.venues.add(event.venue);
      }
    }

    log("main", `Unique artists: ${artistMap.size}`);

    // ── Step 3: Clear old performers ──
    log("main", "=== CLEARING OLD DATA ===");
    const { data: existing } = await supabase
      .from("performers")
      .select("id")
      .order("name");

    if (existing && existing.length > 0) {
      log("main", `Removing ${existing.length} old performers...`);
      for (const p of existing) {
        await supabase.from("scraped_profiles").delete().eq("performer_id", p.id);
        await supabase.from("events").delete().eq("performer_id", p.id);
        await supabase.from("collections").delete().eq("performer_id", p.id);
        await supabase.from("fan_tiers").delete().eq("performer_id", p.id);
        await supabase.from("messages").delete().eq("performer_id", p.id);
      }
      for (const p of existing) {
        await supabase.from("performers").delete().eq("id", p.id);
      }
    }
    // Also clear orphan venues
    await supabase.from("venues").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log("main", "Old data cleared.");

    // ── Step 4: Insert performers + verify SoundCloud ──
    log("main", `=== INSERTING ${artistMap.size} ARTISTS ===`);
    const scPage = await context.newPage();
    let inserted = 0;
    let scVerified = 0;
    const total = artistMap.size;

    for (const [key, meta] of artistMap.entries()) {
      // Skip non-artist entries (events, parties, etc.)
      if (isNonArtistName(meta.displayName)) {
        log("main", `  SKIP (non-artist): ${meta.displayName}`);
        continue;
      }

      const idx = inserted + 1;
      const genres = [...meta.genres].filter(Boolean);
      const uniqueGenres = [...new Set(genres)].slice(0, 5);
      const slug = slugify(meta.displayName);

      // Verify SoundCloud profile
      const sc = await verifySoundCloud(scPage, meta.displayName);
      if (sc) scVerified++;
      await sleep(300);

      const { data: newP, error } = await supabase
        .from("performers")
        .insert({
          name: meta.displayName,
          slug,
          bio: null,
          photo_url: null,
          soundcloud_url: sc?.url || null,
          instagram_handle: null,
          city: "Chicago",
          genres: uniqueGenres.length > 0 ? uniqueGenres : ["electronic"],
          follower_count: 0,
          claimed: false,
        })
        .select("id")
        .single();

      if (error) {
        // Slug conflict
        const { data: retry } = await supabase
          .from("performers")
          .insert({
            name: meta.displayName,
            slug: `${slug}-2`,
            bio: null,
            photo_url: null,
            soundcloud_url: sc?.url || null,
            instagram_handle: null,
            city: "Chicago",
            genres: uniqueGenres.length > 0 ? uniqueGenres : ["electronic"],
            follower_count: 0,
            claimed: false,
          })
          .select("id")
          .single();
        if (retry) {
          inserted++;
          await insertEventsForPerformer(retry.id, key, allEvents, supabase);
        } else {
          logError("main", `SKIP: ${meta.displayName}`, error);
        }
      } else if (newP) {
        inserted++;
        await insertEventsForPerformer(newP.id, key, allEvents, supabase);
      }

      const scTag = sc ? " [SC]" : "";
      if (idx % 20 === 0 || idx === total) {
        log("main", `  Progress: ${idx}/${total} (${scVerified} SC verified)${scTag}`);
      }
    }

    await scPage.close();

    // ── Step 5: Stats ──
    const { data: final } = await supabase
      .from("performers")
      .select("id, name, soundcloud_url, genres")
      .order("name");

    const { count: eventCount } = await supabase.from("events").select("id", { count: "exact", head: true });
    const { count: venueCount } = await supabase.from("venues").select("id", { count: "exact", head: true });

    if (final) {
      log("main", "\n=== FINAL STATS ===");
      log("main", `Performers:  ${final.length}`);
      log("main", `Events:      ${eventCount}`);
      log("main", `Venues:      ${venueCount}`);
      log("main", `SoundCloud:  ${final.filter((p) => p.soundcloud_url).length}/${final.length}`);

      // Genre breakdown
      const genreCounts = new Map<string, number>();
      for (const p of final) {
        for (const g of (p.genres || [])) {
          genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
        }
      }
      const topGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      log("main", `\nGenre breakdown:`);
      for (const [genre, count] of topGenres) {
        log("main", `  ${genre}: ${count}`);
      }
    }
  } finally {
    if (browser) await browser.close();
  }
}

async function insertEventsForPerformer(
  performerId: string,
  artistKey: string,
  allEvents: ScrapedEvent[],
  supabase: ReturnType<typeof getSupabase>
) {
  for (const event of allEvents) {
    const match = event.artists.some(
      (a) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === artistKey
    );
    if (!match) continue;

    // Find or create venue
    let venueId: string | null = null;
    if (event.venue) {
      const venueSlug = slugify(event.venue);
      const { data: existingVenue } = await supabase
        .from("venues")
        .select("id")
        .eq("slug", venueSlug)
        .single();

      if (existingVenue) {
        venueId = existingVenue.id;
      } else {
        const { data: newVenue } = await supabase
          .from("venues")
          .insert({
            name: event.venue,
            slug: venueSlug,
            city: "Chicago",
            latitude: 41.8781,
            longitude: -87.6298,
          })
          .select("id")
          .single();
        venueId = newVenue?.id || null;
      }
    }

    await supabase
      .from("events")
      .insert({
        performer_id: performerId,
        venue_id: venueId,
        event_date: event.date,
        source: "edmtrain",
        external_url: event.ticketUrl || null,
      })
      .select("id")
      .single();
  }
}

main().catch(console.error);
