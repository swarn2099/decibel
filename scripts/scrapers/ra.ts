import { chromium } from "playwright";
import { getSupabase, slugify, namesMatch, log, logError, isNonArtistName } from "./utils";

const RA_VENUES: { name: string; raSlug: string; dbSlug: string }[] = [
  { name: "Smartbar", raSlug: "smartbar", dbSlug: "smartbar" },
  { name: "Soundbar", raSlug: "soundbar-chicago", dbSlug: "soundbar" },
  { name: "Spybar", raSlug: "spybar", dbSlug: "spybar" },
  { name: "Concord Music Hall", raSlug: "concord-music-hall", dbSlug: "concord-music-hall" },
  { name: "The Mid", raSlug: "the-mid", dbSlug: "the-mid" },
  { name: "Primary", raSlug: "primary-chicago", dbSlug: "primary" },
  { name: "Radius Chicago", raSlug: "radius-chicago", dbSlug: "radius-chicago" },
  { name: "309 N Morgan", raSlug: "309-n-morgan", dbSlug: "309-n-morgan" },
  { name: "Podlasie", raSlug: "podlasie", dbSlug: "podlasie" },
];

export async function scrapeRA() {
  const supabase = getSupabase();

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    let totalEvents = 0;
    let newPerformers = 0;

    for (const venue of RA_VENUES) {
      log("ra", `Scraping: ${venue.name}`);

      try {
        // Try past events page
        await page.goto(`https://ra.co/clubs/${venue.raSlug}/past-events`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page.waitForTimeout(4000);

        // Scroll to load content
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(2000);
        }

        // Extract events — RA uses varied markup, so cast a wide net
        const events = await page.evaluate(() => {
          const results: { artists: string[]; date: string; title: string }[] = [];

          // Strategy 1: Look for event links with artist names
          const allLinks = document.querySelectorAll("a[href*='/events/']");
          const seenHrefs = new Set<string>();

          allLinks.forEach((link) => {
            const href = link.getAttribute("href") || "";
            if (seenHrefs.has(href)) return;
            seenHrefs.add(href);

            const container = link.closest("li, article, div[class*='event'], div[class*='Event']") || link.parentElement;
            if (!container) return;

            const title = link.textContent?.trim() || "";

            // Look for date in the container or nearby
            const dateEl = container.querySelector("time, [datetime]");
            const date = dateEl?.getAttribute("datetime") || dateEl?.textContent?.trim() || "";

            // Look for artist/DJ names — typically in separate elements
            const artistEls = container.querySelectorAll("a[href*='/dj/'], a[href*='/artist/']");
            let artists: string[] = [];

            if (artistEls.length > 0) {
              artists = Array.from(artistEls)
                .map((a) => a.textContent?.trim() || "")
                .filter((a) => a.length > 1 && a.length < 60);
            }

            // If no artist links found, try to parse from title
            if (artists.length === 0 && title) {
              // Common patterns: "Artist1, Artist2" or "Artist1 b2b Artist2"
              const parts = title
                .split(/[,&]|b2b|\|/)
                .map((s) => s.trim())
                .filter((s) => s.length > 1 && s.length < 60);
              if (parts.length > 0) artists = parts;
            }

            if (artists.length > 0 || title.length > 2) {
              results.push({
                artists: artists.length > 0 ? artists : [title],
                date,
                title,
              });
            }
          });

          // Strategy 2: Look for lineup-style lists
          if (results.length === 0) {
            const textBlocks = document.querySelectorAll("p, span, div");
            textBlocks.forEach((el) => {
              const text = el.textContent?.trim() || "";
              // Look for comma-separated lists of names that look like lineups
              if (text.includes(",") && text.length > 10 && text.length < 500) {
                const names = text.split(",").map((n) => n.trim()).filter((n) => n.length > 1 && n.length < 50);
                if (names.length >= 2) {
                  results.push({ artists: names, date: "", title: text.slice(0, 100) });
                }
              }
            });
          }

          return results.slice(0, 40);
        });

        // Get venue ID
        const { data: dbVenue } = await supabase
          .from("venues")
          .select("id")
          .eq("slug", venue.dbSlug)
          .single();

        if (!dbVenue) {
          log("ra", `Venue ${venue.name} not in DB — skipping`);
          continue;
        }

        for (const event of events) {
          for (const artistName of event.artists) {
            if (!artistName || artistName.length < 2) continue;

            // Skip common non-artist strings
            if (/^\d+$/.test(artistName) || /ticket|rsvp|free|sold out/i.test(artistName)) continue;
            if (isNonArtistName(artistName)) {
              log("ra", `  SKIP (non-artist): ${artistName}`);
              continue;
            }

            const { data: existing } = await supabase
              .from("performers")
              .select("id, name")
              .or(`slug.eq.${slugify(artistName)},name.ilike.${artistName}`);

            const match = existing?.find((p) => namesMatch(p.name, artistName));
            let performerId: string;

            if (match) {
              performerId = match.id;
            } else {
              const { data: newP, error } = await supabase
                .from("performers")
                .insert({
                  name: artistName,
                  slug: slugify(artistName),
                  city: "Chicago",
                  genres: ["electronic"],
                })
                .select("id")
                .single();

              if (error || !newP) continue;
              performerId = newP.id;
              newPerformers++;
            }

            const eventDate = parseDate(event.date);
            if (eventDate) {
              const { error: evErr } = await supabase.from("events").insert({
                performer_id: performerId,
                venue_id: dbVenue.id,
                event_date: eventDate,
                source: "ra",
              });
              if (!evErr) totalEvents++;
            }

            await supabase.from("scraped_profiles").insert({
              performer_id: performerId,
              source: "ra",
              raw_data: { venue: venue.name, event_title: event.title, date: event.date },
            });
          }
        }

        log("ra", `${venue.name}: found ${events.length} events`);
      } catch (err) {
        logError("ra", `Failed to scrape ${venue.name}`, err);
      }

      await page.waitForTimeout(3000);
    }

    log("ra", `Done. ${totalEvents} events, ${newPerformers} new performers.`);
  } finally {
    if (browser) await browser.close();
  }
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {
    // ignore
  }

  // Try various patterns
  const patterns = [
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      try {
        const d = new Date(match[0]);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      } catch {
        continue;
      }
    }
  }

  return null;
}

if (require.main === module) {
  scrapeRA().catch(console.error);
}
