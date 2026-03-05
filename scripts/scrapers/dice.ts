import { chromium } from "playwright";
import { getSupabase, slugify, namesMatch, log, logError } from "./utils";

export async function scrapeDICE() {
  const supabase = getSupabase();

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    log("dice", "Navigating to DICE Chicago events...");

    await page.goto("https://dice.fm/browse/chicago/music", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForTimeout(5000);

    // Scroll to load more events
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }

    // Extract events
    const events = await page.evaluate(() => {
      const results: { title: string; venue: string; date: string; artists: string[] }[] = [];

      const eventCards = document.querySelectorAll("[class*='EventCard'], [class*='event-card'], article, a[href*='/event/']");

      eventCards.forEach((card) => {
        const title = card.querySelector("h3, h4, [class*='title'], [class*='name']")?.textContent?.trim() || "";
        const venue = card.querySelector("[class*='venue'], [class*='location']")?.textContent?.trim() || "";
        const date = card.querySelector("time, [class*='date']")?.textContent?.trim() || "";

        if (title) {
          // Parse artists from title (common format: "Artist1, Artist2 at Venue")
          const artistPart = title.split(/\s+at\s+/i)[0];
          const artists = artistPart
            .split(/[,&]/)
            .map((a) => a.trim())
            .filter((a) => a.length > 1 && a.length < 50);

          results.push({
            title,
            venue,
            date,
            artists: artists.length > 0 ? artists : [title],
          });
        }
      });

      return results.slice(0, 50);
    });

    log("dice", `Found ${events.length} events`);

    let totalEvents = 0;
    let newPerformers = 0;

    for (const event of events) {
      // Try to match venue
      let venueId: string | null = null;
      if (event.venue) {
        const { data: dbVenue } = await supabase
          .from("venues")
          .select("id")
          .ilike("name", `%${event.venue.split(",")[0].trim()}%`)
          .single();

        venueId = dbVenue?.id || null;
      }

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

        // Parse date
        const eventDate = parseDICEDate(event.date);
        if (eventDate) {
          const { error: evErr } = await supabase.from("events").insert({
            performer_id: performerId,
            venue_id: venueId,
            event_date: eventDate,
            source: "dice",
          });
          if (!evErr) totalEvents++;
        }

        await supabase.from("scraped_profiles").insert({
          performer_id: performerId,
          source: "dice",
          raw_data: { event_title: event.title, venue: event.venue, date: event.date },
        });
      }
    }

    log("dice", `Done. ${totalEvents} events, ${newPerformers} new performers.`);
  } finally {
    if (browser) await browser.close();
  }
}

function parseDICEDate(dateStr: string): string | null {
  if (!dateStr) return null;

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {
    // ignore
  }

  // Common DICE format: "Sat 15 Mar"
  const match = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
  if (match) {
    const year = new Date().getFullYear();
    const d = new Date(`${match[2]} ${match[1]}, ${year}`);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  return null;
}

if (require.main === module) {
  scrapeDICE().catch(console.error);
}
