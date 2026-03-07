/**
 * 19hz.info Scraper: Fetches Chicago electronic music events from 19hz.info,
 * a community-maintained electronic music events aggregator.
 *
 * Originally planned as Bandsintown scraper but their API is fully locked down.
 * 19hz is a better source for electronic/underground music anyway.
 *
 * URL: https://19hz.info/eventlisting_CHI.php
 * Data: HTML table with date, event name, venue, genre, links
 */
import { getSupabase, slugify, namesMatch, log, logError, isNonArtistName } from "./utils";

const SOURCE_URL = "https://19hz.info/eventlisting_CHI.php";
const SOURCE_TAG = "19hz";
const DELAY_MS = 200;

interface ParsedEvent {
  date: string; // YYYY/MM/DD or YYYY-MM-DD
  eventName: string;
  eventUrl: string;
  venue: string;
  city: string;
  genres: string[];
  artists: string[];
}

/**
 * Parse artist names from an event title.
 * Common patterns:
 *  - "Artist1 b2b Artist2"
 *  - "Presents: Artist"
 *  - "Artist @ Venue" (venue already stripped)
 *  - "Artist1, Artist2, Artist3"
 *  - "Artist1 + Artist2"
 *  - "Event Name feat. Artist"
 *  - "Event Name w/ Artist1, Artist2"
 */
function extractArtists(eventName: string): string[] {
  let working = eventName;

  // Remove "Presents:" prefix (promoter name)
  working = working.replace(/^[^:]+presents:\s*/i, "");

  // If "feat." or "featuring" or "w/" is present, take what follows
  const featMatch = working.match(/(?:feat\.?|featuring|w\/)\s+(.+)/i);
  if (featMatch) {
    working = featMatch[1];
  }

  // Split by b2b (keep both sides as separate artists)
  // Split by common delimiters: ",", " + ", " & ", " x "
  const parts = working
    .split(/\s+b2b\s+/i)
    .flatMap((p) => p.split(/\s*[,]\s*/))
    .flatMap((p) => p.split(/\s+\+\s+/))
    .flatMap((p) => p.split(/\s+&\s+/))
    .flatMap((p) => p.split(/\s+x\s+/i))
    .map((p) => p.trim())
    .filter((p) => p.length >= 2 && p.length < 60);

  return parts;
}

/**
 * Parse a single <tr> row from 19hz HTML into a ParsedEvent.
 * Row structure:
 *  td[0]: Date/time (e.g., "Fri: Mar 6<br />(8pm-3am)")
 *  td[1]: Event name + venue in div.eventCol  -- "<a>Event</a> @ Venue (City)"
 *  td[2]: Genre (e.g., "house, techno")
 *  td[3]: Price/age info
 *  td[4]: Promoter
 *  td[5]: Links (Facebook, etc.)
 *  td[6]: Sort date in div.shrink (YYYY/MM/DD)
 */
function parseRow(tr: string): ParsedEvent | null {
  // Extract all <td> contents
  const tdMatches = [...tr.matchAll(/<td[^>]*>([\s\S]*?)(?:<\/td>|(?=<td))/gi)];
  if (tdMatches.length < 2) return null;

  // Get sort date from last td (div.shrink)
  const lastTd = tdMatches[tdMatches.length - 1]?.[1] || "";
  const dateMatch = lastTd.match(/(\d{4}\/\d{2}\/\d{2})/);
  if (!dateMatch) return null;
  const date = dateMatch[1].replace(/\//g, "-");

  // Get event info from td[1]
  const eventTd = tdMatches[1]?.[1] || "";

  // Extract event URL and name from <a> tag
  const linkMatch = eventTd.match(/<a\s+href='([^']*)'[^>]*>([^<]*)<\/a>/i);
  const eventName = linkMatch?.[2]?.trim() || "";
  const eventUrl = linkMatch?.[1] || "";
  if (!eventName) return null;

  // Extract venue from "@ Venue (City)" pattern after the </div>
  const venueMatch = eventTd.match(/@\s*([^(]+)\s*\(([^)]+)\)/);
  const venue = venueMatch?.[1]?.trim() || "";
  const city = venueMatch?.[2]?.trim() || "";

  // Get genres from td[2]
  const genreTd = tdMatches[2]?.[1] || "";
  const genreText = genreTd.replace(/<[^>]+>/g, "").trim();
  const genres = genreText
    ? genreText
        .split(/[,;]/)
        .map((g) => g.trim().toLowerCase())
        .filter((g) => g.length > 0)
    : [];

  // Extract artists from event name
  const artists = extractArtists(eventName);

  return { date, eventName, eventUrl, venue, city, genres, artists };
}

// Venue name matching — same pattern as ra.ts and dice.ts
const VENUE_NAME_MAP: Record<string, string> = {
  smartbar: "smartbar",
  "smart bar": "smartbar",
  spybar: "spybar",
  "spy bar": "spybar",
  primary: "primary",
  "309 n morgan": "311-n-morgan-st",
  "309 n. morgan": "311-n-morgan-st",
  "morgan mfg": "morgan-mfg",
  podlasie: "podlasie",
  "podlasie club": "podlasie",
  "sound-bar": "sound-bar-chicago",
  "sound bar": "sound-bar-chicago",
  soundbar: "sound-bar-chicago",
  "concord music hall": "concord-music-hall",
  "radius chicago": "radius",
  radius: "radius",
  "cermak hall": "cermak-hall-at-radius",
  prysm: "prysm",
  "prysm nightclub": "prysm",
  "the mid": "the-mid",
  metro: "metro-chicago",
  "metro chicago": "metro-chicago",
  "empty bottle": "empty-bottle",
  "sleeping village": "sleeping-village",
};

function matchVenueSlug(venueName: string): string | null {
  const lower = venueName.toLowerCase().trim();
  for (const [pattern, slug] of Object.entries(VENUE_NAME_MAP)) {
    if (lower === pattern || lower.startsWith(pattern + " ") || lower.includes(pattern)) {
      return slug;
    }
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrape19hz() {
  const supabase = getSupabase();

  log(SOURCE_TAG, `Fetching Chicago electronic events from ${SOURCE_URL}`);

  const res = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching 19hz`);
  }

  const html = await res.text();
  log(SOURCE_TAG, `Fetched ${(html.length / 1024).toFixed(0)}KB of HTML`);

  // Extract all <tr> rows
  const rows = [...html.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)];
  log(SOURCE_TAG, `Found ${rows.length} table rows`);

  // Parse events
  const events: ParsedEvent[] = [];
  for (const row of rows) {
    const parsed = parseRow(row[0]);
    if (parsed && parsed.city.toLowerCase().includes("chicago")) {
      events.push(parsed);
    }
  }

  log(SOURCE_TAG, `Parsed ${events.length} Chicago events`);

  // Collect unique artists
  const artistsSeen = new Map<
    string,
    {
      name: string;
      events: { date: string; venue: string; eventName: string; url: string; genres: string[] }[];
    }
  >();

  for (const event of events) {
    for (const artistName of event.artists) {
      if (isNonArtistName(artistName)) continue;
      if (artistName.length < 2) continue;

      const key = artistName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (key.length < 2) continue;

      if (!artistsSeen.has(key)) {
        artistsSeen.set(key, { name: artistName, events: [] });
      }

      artistsSeen.get(key)!.events.push({
        date: event.date,
        venue: event.venue,
        eventName: event.eventName,
        url: event.eventUrl,
        genres: event.genres,
      });
    }
  }

  log(SOURCE_TAG, `Unique artists: ${artistsSeen.size}`);

  // Cross-reference with DB
  const { data: existingPerformers } = await supabase
    .from("performers")
    .select("id, name, slug, photo_url, genres");

  const existingMap = new Map<string, (typeof existingPerformers extends (infer T)[] | null ? T : never)>();
  for (const p of existingPerformers || []) {
    const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    existingMap.set(key, p);
    existingMap.set(p.slug, p);
  }

  // Pre-fetch venue IDs
  const { data: dbVenues } = await supabase.from("venues").select("id, slug, name");
  const venueIdMap = new Map<string, string>();
  for (const v of dbVenues || []) {
    venueIdMap.set(v.slug, v.id);
    venueIdMap.set(v.name.toLowerCase(), v.id);
  }

  let newPerformers = 0;
  let updatedPerformers = 0;
  let totalEventsInserted = 0;
  let skipped = 0;
  let processed = 0;
  const totalArtists = artistsSeen.size;

  for (const [key, artist] of artistsSeen) {
    processed++;
    if (processed % 50 === 0) {
      log(SOURCE_TAG, `  Processing ${processed}/${totalArtists}...`);
    }

    // Find existing performer
    let existing = existingMap.get(key);
    if (!existing) {
      const slug = slugify(artist.name);
      existing = existingMap.get(slug);
    }
    if (!existing && existingPerformers) {
      existing = existingPerformers.find((p) => namesMatch(p.name, artist.name)) || undefined;
    }

    // Collect genres from all events
    const allGenres = new Set<string>();
    for (const ev of artist.events) {
      for (const g of ev.genres) allGenres.add(g);
    }

    let performerId: string;

    if (existing) {
      // Update genres if we have new ones
      const updates: Record<string, any> = {};
      const existingGenres = new Set(existing.genres || []);
      const newGenres = [...allGenres].filter((g) => !existingGenres.has(g));
      if (newGenres.length > 0) {
        updates.genres = [...existingGenres, ...newGenres].slice(0, 10);
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("performers").update(updates).eq("id", existing.id);
        updatedPerformers++;
      }

      performerId = existing.id;
    } else {
      // Insert new performer
      const { data: newP, error } = await supabase
        .from("performers")
        .insert({
          name: artist.name,
          slug: slugify(artist.name),
          city: "Chicago",
          genres: [...allGenres].slice(0, 5) || ["electronic"],
          claimed: false,
        })
        .select("id")
        .single();

      if (error) {
        // Slug conflict — try with suffix
        const { data: retry } = await supabase
          .from("performers")
          .insert({
            name: artist.name,
            slug: `${slugify(artist.name)}-19hz`,
            city: "Chicago",
            genres: [...allGenres].slice(0, 5) || ["electronic"],
            claimed: false,
          })
          .select("id")
          .single();

        if (!retry) {
          skipped++;
          continue;
        }
        performerId = retry.id;
      } else {
        performerId = newP!.id;
      }
      newPerformers++;
    }

    // Insert events for this performer
    for (const ev of artist.events) {
      if (!ev.date) continue;

      // Resolve venue ID
      let venueId: string | null = null;
      if (ev.venue) {
        const slug = matchVenueSlug(ev.venue);
        if (slug) venueId = venueIdMap.get(slug) || null;
        if (!venueId) venueId = venueIdMap.get(ev.venue.toLowerCase()) || null;
        if (!venueId) {
          const vSlug = slugify(ev.venue);
          const existingVId = venueIdMap.get(vSlug);
          if (existingVId) {
            venueId = existingVId;
          } else {
            const { data: newV } = await supabase
              .from("venues")
              .insert({
                name: ev.venue,
                slug: vSlug,
                city: "Chicago",
                latitude: 41.8781,
                longitude: -87.6298,
              })
              .select("id")
              .single();
            if (newV) {
              venueId = newV.id;
              venueIdMap.set(vSlug, newV.id);
              venueIdMap.set(ev.venue.toLowerCase(), newV.id);
            }
          }
        }
      }

      // Check for duplicate event
      const { data: existingEvent } = await supabase
        .from("events")
        .select("id")
        .eq("performer_id", performerId)
        .eq("event_date", ev.date)
        .eq("source", SOURCE_TAG)
        .maybeSingle();

      if (!existingEvent) {
        const { error: evErr } = await supabase.from("events").insert({
          performer_id: performerId,
          venue_id: venueId,
          event_date: ev.date,
          source: SOURCE_TAG,
          external_url: ev.url || null,
        });
        if (!evErr) totalEventsInserted++;
      }

      await sleep(DELAY_MS);
    }
  }

  // Stats
  log(SOURCE_TAG, "\n=== 19HZ SCRAPE RESULTS ===");
  log(SOURCE_TAG, `Events parsed from page: ${events.length}`);
  log(SOURCE_TAG, `Unique artists found: ${artistsSeen.size}`);
  log(SOURCE_TAG, `New performers added: ${newPerformers}`);
  log(SOURCE_TAG, `Existing performers updated: ${updatedPerformers}`);
  log(SOURCE_TAG, `Events inserted: ${totalEventsInserted}`);
  log(SOURCE_TAG, `Skipped (errors): ${skipped}`);

  // Venue breakdown
  log(SOURCE_TAG, "\n--- Venue Hits ---");
  const venueCounts = new Map<string, number>();
  for (const e of events) {
    const v = e.venue || "Unknown";
    venueCounts.set(v, (venueCounts.get(v) || 0) + 1);
  }
  const sorted = [...venueCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [v, c] of sorted.slice(0, 20)) {
    log(SOURCE_TAG, `  ${v}: ${c}`);
  }

  // Genre breakdown
  log(SOURCE_TAG, "\n--- Genre Hits ---");
  const genreCounts = new Map<string, number>();
  for (const e of events) {
    for (const g of e.genres) {
      genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
    }
  }
  const sortedGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [g, c] of sortedGenres.slice(0, 15)) {
    log(SOURCE_TAG, `  ${g}: ${c}`);
  }
}

if (require.main === module) {
  scrape19hz().catch(console.error);
}
