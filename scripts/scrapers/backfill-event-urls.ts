/**
 * Backfills external_url for existing events by re-scraping EDMTrain
 * and matching performer + date + venue.
 */
import { chromium } from "playwright";
import { getSupabase, log } from "./utils";

async function main() {
  const supabase = getSupabase();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://edmtrain.com/chicago-il", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  for (let i = 0; i < 10; i++) {
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await page.waitForTimeout(1200);
  }

  // Extract event URL + performer + date mapping
  const eventData = await page.evaluate(`
    (() => {
      const results = [];
      const containers = document.querySelectorAll('.eventContainer');
      containers.forEach(c => {
        const sorteddate = c.getAttribute('sorteddate') || '';
        const venue = c.getAttribute('venue') || '';
        const linkEl = c.querySelector('a[itemprop="url"]');
        const eventUrl = linkEl?.getAttribute('href') || '';

        const performerEls = c.querySelectorAll('[itemprop="performer"]');
        const artists = [];
        performerEls.forEach(el => {
          const name = el.textContent?.trim();
          if (name) artists.push(name);
        });

        if (eventUrl && artists.length > 0 && sorteddate) {
          results.push({ date: sorteddate, artists, venue, eventUrl });
        }
      });
      return results;
    })()
  `) as Array<{ date: string; artists: string[]; venue: string; eventUrl: string }>;

  await browser.close();
  log("backfill", `Found ${eventData.length} events with URLs from EDMTrain`);

  // Get all performers from DB
  const { data: performers } = await supabase
    .from("performers")
    .select("id, name");

  if (!performers) return;

  const performerMap = new Map<string, string>();
  for (const p of performers) {
    performerMap.set(p.name.toLowerCase(), p.id);
  }

  // Update events
  let updated = 0;
  for (const event of eventData) {
    for (const artist of event.artists) {
      const performerId = performerMap.get(artist.toLowerCase());
      if (!performerId) continue;

      const { data: existingEvents } = await supabase
        .from("events")
        .select("id, external_url")
        .eq("performer_id", performerId)
        .eq("event_date", event.date)
        .is("external_url", null);

      if (existingEvents && existingEvents.length > 0) {
        for (const e of existingEvents) {
          await supabase
            .from("events")
            .update({ external_url: event.eventUrl })
            .eq("id", e.id);
          updated++;
        }
      }
    }
  }

  log("backfill", `Updated ${updated} events with URLs`);
}

main().catch(console.error);
