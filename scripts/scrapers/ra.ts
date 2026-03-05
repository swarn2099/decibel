import { chromium } from "playwright";
import { getSupabase, slugify, namesMatch, log, logError } from "./utils";

// Chicago venues on RA — these are RA club IDs/slugs
const RA_VENUES: { name: string; raSlug: string; dbSlug: string }[] = [
  { name: "Smartbar", raSlug: "smartbar", dbSlug: "smartbar" },
  { name: "Soundbar", raSlug: "soundbar-chicago", dbSlug: "soundbar" },
  { name: "Spybar", raSlug: "spybar", dbSlug: "spybar" },
  { name: "Concord Music Hall", raSlug: "concord-music-hall", dbSlug: "concord" },
  { name: "The Mid", raSlug: "the-mid", dbSlug: "the-mid" },
  { name: "Primary", raSlug: "primary-chicago", dbSlug: "primary" },
  { name: "Radius Chicago", raSlug: "radius-chicago", dbSlug: "radius" },
];

export async function scrapeRA() {
  const supabase = getSupabase();

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Set a reasonable user agent
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    let totalEvents = 0;
    let newPerformers = 0;

    for (const venue of RA_VENUES) {
      log("ra", `Scraping: ${venue.name}`);

      try {
        // Navigate to venue's past events
        await page.goto(`https://ra.co/clubs/${venue.raSlug}/past-events`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        await page.waitForTimeout(3000);

        // Extract event data from the page
        const events = await page.evaluate(() => {
          const results: { title: string; date: string; artists: string[] }[] = [];

          // RA uses various selectors — try common patterns
          const eventElements = document.querySelectorAll("[data-testid='event-item'], li[class*='event'], article");

          eventElements.forEach((el) => {
            const title = el.querySelector("h3, h4, [class*='title']")?.textContent?.trim() || "";
            const date = el.querySelector("time, [class*='date']")?.textContent?.trim() || "";

            // Artists are typically in links or specific elements
            const artistEls = el.querySelectorAll("a[href*='/dj/'], [class*='artist'], [class*='lineup'] a");
            const artists = Array.from(artistEls)
              .map((a) => a.textContent?.trim() || "")
              .filter((a) => a.length > 0 && a.length < 50);

            if (artists.length > 0 || title) {
              results.push({ title, date, artists: artists.length > 0 ? artists : [title] });
            }
          });

          return results.slice(0, 30); // Last 30 events
        });

        // Get venue ID from our DB
        const { data: dbVenue } = await supabase
          .from("venues")
          .select("id")
          .eq("slug", venue.dbSlug)
          .single();

        if (!dbVenue) {
          log("ra", `Venue ${venue.name} not found in DB — skipping`);
          continue;
        }

        for (const event of events) {
          for (const artistName of event.artists) {
            if (!artistName || artistName.length < 2) continue;

            // Find or create performer
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

            // Parse date — try common formats
            const eventDate = parseRADate(event.date);

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

      await page.waitForTimeout(2000); // Rate limit
    }

    log("ra", `Done. ${totalEvents} events, ${newPerformers} new performers.`);
  } finally {
    if (browser) await browser.close();
  }
}

function parseRADate(dateStr: string): string | null {
  if (!dateStr) return null;

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  } catch {
    // ignore
  }

  // Try extracting date patterns
  const match = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i);
  if (match) {
    const d = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  return null;
}

if (require.main === module) {
  scrapeRA().catch(console.error);
}
