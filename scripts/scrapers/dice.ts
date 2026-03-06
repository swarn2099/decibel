import { chromium } from "playwright";
import { getSupabase, slugify, namesMatch, log, logError } from "./utils";

export async function scrapeDICE() {
  const supabase = getSupabase();

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    log("dice", "Navigating to DICE Chicago...");

    // Try multiple DICE URL patterns
    const urls = [
      "https://dice.fm/browse/chicago",
      "https://dice.fm/browse/chicago/music",
      "https://dice.fm/search?query=chicago&type=events",
    ];

    let loaded = false;
    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(4000);
        loaded = true;
        log("dice", `Loaded: ${url}`);
        break;
      } catch {
        log("dice", `Failed to load ${url}, trying next...`);
      }
    }

    if (!loaded) {
      log("dice", "Could not load any DICE page — skipping");
      return;
    }

    // Scroll to load more events
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }

    // Extract events with wide selector net
    const events = await page.evaluate(() => {
      const results: { title: string; venue: string; date: string; url: string }[] = [];

      // Strategy 1: Event card links
      const eventLinks = document.querySelectorAll(
        'a[href*="/event/"], a[href*="/events/"]'
      );
      const seenUrls = new Set<string>();

      eventLinks.forEach((link) => {
        const href = link.getAttribute("href") || "";
        if (seenUrls.has(href)) return;
        seenUrls.add(href);

        const container = link.closest("li, article, div") || link;

        const title = (
          container.querySelector("h3, h4, [class*='title'], [class*='name']") ||
          link
        )?.textContent?.trim() || "";

        const venue =
          container.querySelector(
            "[class*='venue'], [class*='location'], [class*='subtitle']"
          )?.textContent?.trim() || "";

        const dateEl = container.querySelector("time, [datetime], [class*='date']");
        const date = dateEl?.getAttribute("datetime") || dateEl?.textContent?.trim() || "";

        if (title && title.length > 2 && title.length < 200) {
          results.push({
            title,
            venue,
            date,
            url: href.startsWith("http") ? href : `https://dice.fm${href}`,
          });
        }
      });

      // Strategy 2: Broader card-based extraction
      if (results.length === 0) {
        const cards = document.querySelectorAll(
          "[class*='card'], [class*='Card'], [class*='event'], [class*='Event']"
        );
        cards.forEach((card) => {
          const title = card.querySelector("h2, h3, h4")?.textContent?.trim() || "";
          const venue = card.querySelector("[class*='venue'], [class*='location']")?.textContent?.trim() || "";
          const date = card.querySelector("time")?.textContent?.trim() || "";

          if (title && title.length > 2) {
            results.push({ title, venue, date, url: "" });
          }
        });
      }

      return results.slice(0, 60);
    });

    log("dice", `Found ${events.length} events`);

    let totalEvents = 0;
    let newPerformers = 0;

    for (const event of events) {
      // Parse artists from title
      // Common formats: "Artist1, Artist2 at Venue" or "Artist1 + Artist2"
      const titleParts = event.title.split(/\s+at\s+/i);
      const artistPart = titleParts[0];

      const artists = artistPart
        .split(/[,&+]|\s+x\s+|\s+b2b\s+/i)
        .map((a) => a.replace(/presents?:?/i, "").trim())
        .filter((a) => a.length > 1 && a.length < 60 && !/ticket|rsvp|free|sold/i.test(a));

      if (artists.length === 0) continue;

      // Try to match venue
      let venueId: string | null = null;
      const venueSearch = event.venue || (titleParts[1] || "");
      if (venueSearch) {
        const { data: dbVenue } = await supabase
          .from("venues")
          .select("id")
          .ilike("name", `%${venueSearch.split(",")[0].trim().slice(0, 20)}%`)
          .limit(1)
          .single();
        venueId = dbVenue?.id || null;
      }

      for (const artistName of artists) {
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
            venue_id: venueId,
            event_date: eventDate,
            source: "dice",
            external_url: event.url || null,
          });
          if (!evErr) totalEvents++;
        }

        await supabase.from("scraped_profiles").insert({
          performer_id: performerId,
          source: "dice",
          raw_data: { event_title: event.title, venue: event.venue, date: event.date, url: event.url },
        });
      }
    }

    log("dice", `Done. ${totalEvents} events, ${newPerformers} new performers.`);
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

  const patterns = [
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i,
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const year = new Date().getFullYear();
      try {
        const d = new Date(`${match[0]} ${year}`);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      } catch {
        continue;
      }
    }
  }

  return null;
}

if (require.main === module) {
  scrapeDICE().catch(console.error);
}
