/**
 * DICE Scraper: Fetches Chicago event listings from DICE's Next.js data routes.
 * Uses their browse endpoint with city ID chicago-5b238ca66e4bcd93783835b0.
 * Extracts artists from summary_lineup.top_artists and event descriptions.
 * Cross-references against existing DB performers.
 *
 * Chicago city ID: 5b238ca66e4bcd93783835b0
 */
import { getSupabase, slugify, namesMatch, log, logError, isNonArtistName } from "./utils";

const DICE_CITY_SLUG = "chicago-5b238ca66e4bcd93783835b0";
const DELAY_MS = 500;

// Categories to scrape — DJ and Party have most electronic music
const CATEGORIES = [
  { slug: "music/dj", label: "DJ" },
  { slug: "music/party", label: "Party" },
  { slug: "music/gig", label: "Gigs" },
];

interface DiceEvent {
  name: string;
  date: string;
  venue: string;
  venueAddress: string;
  artists: { name: string; image: string | null; id: string }[];
  url: string;
  about: string;
}

async function getBuildId(): Promise<string> {
  // Fetch a known working page to get the build ID
  const res = await fetch("https://dice.fm/venue/spybar-pm7k", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const html = await res.text();
  const match = html.match(/"buildId":"([^"]+)"/);
  if (match) return match[1];

  throw new Error("Could not extract DICE build ID");
}

async function fetchDicePage(
  buildId: string,
  categorySlug: string,
  cursor?: string
): Promise<{ events: DiceEvent[]; nextCursor: string | null }> {
  let url = `https://dice.fm/_next/data/${buildId}/en/browse/${DICE_CITY_SLUG}/${categorySlug}.json`;
  if (cursor) {
    url += `?cursor=${encodeURIComponent(cursor)}`;
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  const data = await res.json();
  const pp = data.pageProps || {};
  const rawEvents = pp.events || [];
  const nextCursor = pp.nextCursor || null;

  const events: DiceEvent[] = rawEvents.map((e: any) => {
    const topArtists = e.summary_lineup?.top_artists || [];
    const artists = topArtists.map((a: any) => ({
      name: a.name || "",
      image: a.image?.url || null,
      id: a.artist_id || "",
    }));

    // Also try to extract artists from about/description
    const about = e.about?.description || "";

    return {
      name: e.name || "",
      date: e.dates?.event_start_date?.slice(0, 10) || "",
      venue: e.venues?.[0]?.name || "",
      venueAddress: e.venues?.[0]?.address || "",
      artists,
      url: e.perm_name ? `https://dice.fm/event/${e.perm_name}` : "",
      about,
    };
  });

  return { events, nextCursor };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Venue name matching for DICE -> our DB
const VENUE_NAME_MAP: Record<string, string> = {
  "spybar": "spybar",
  "309 n morgan": "311-n-morgan-st",
  "309 n morgan st": "311-n-morgan-st",
  "smartbar": "smartbar",
  "smart bar": "smartbar",
  "sound-bar": "sound-bar-chicago",
  "sound bar": "sound-bar-chicago",
  "soundbar": "sound-bar-chicago",
  "concord music hall": "concord-music-hall",
  "radius": "radius",
  "radius chicago": "radius",
  "prysm": "prysm",
  "the mid": "the-mid",
  "podlasie": "podlasie",
  "primary": "primary",
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

export async function scrapeDICE() {
  const supabase = getSupabase();

  log("dice", "Getting DICE build ID...");
  const buildId = await getBuildId();
  log("dice", `Build ID: ${buildId}`);

  const allEvents: DiceEvent[] = [];

  for (const category of CATEGORIES) {
    log("dice", `Fetching category: ${category.label}`);
    let cursor: string | null = null;
    let pageNum = 0;

    do {
      pageNum++;
      try {
        const { events, nextCursor } = await fetchDicePage(buildId, category.slug, cursor || undefined);
        allEvents.push(...events);
        cursor = nextCursor;
        log("dice", `  ${category.label} page ${pageNum}: ${events.length} events (total: ${allEvents.length})`);
        await sleep(DELAY_MS);
      } catch (err) {
        logError("dice", `Failed to fetch ${category.label} page ${pageNum}`, err);
        break;
      }
    } while (cursor && pageNum < 20); // Safety limit
  }

  log("dice", `Total DICE events fetched: ${allEvents.length}`);

  // Deduplicate by event name + date
  const seen = new Set<string>();
  const uniqueEvents = allEvents.filter((e) => {
    const key = `${e.name}|${e.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  log("dice", `Unique events after dedup: ${uniqueEvents.length}`);

  // Collect unique artists
  const artistsSeen = new Map<string, {
    name: string;
    image: string | null;
    events: { date: string; venue: string; eventName: string; url: string }[];
  }>();

  for (const event of uniqueEvents) {
    let artists = event.artists;

    // If no artists from lineup, try to parse from event name
    if (artists.length === 0) {
      const nameParts = event.name
        .split(/\s+(?:@|at|w\/|with|presents|x)\s+/i)
        .filter((p) => p.length > 1 && p.length < 60);
      if (nameParts.length > 0) {
        // First part is usually the artist
        const artistNames = nameParts[0]
          .split(/[,&+]/)
          .map((a) => a.trim())
          .filter((a) => a.length > 1 && a.length < 60);
        artists = artistNames.map((name) => ({ name, image: null, id: "" }));
      }
    }

    for (const artist of artists) {
      if (isNonArtistName(artist.name)) continue;
      if (artist.name.length < 2) continue;

      const key = artist.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (key.length < 2) continue;

      if (!artistsSeen.has(key)) {
        artistsSeen.set(key, {
          name: artist.name,
          image: artist.image,
          events: [],
        });
      }

      const entry = artistsSeen.get(key)!;
      if (artist.image && !entry.image) entry.image = artist.image;
      entry.events.push({
        date: event.date,
        venue: event.venue,
        eventName: event.name,
        url: event.url,
      });
    }
  }

  log("dice", `Unique artists: ${artistsSeen.size}`);

  // Cross-reference with DB
  const { data: existingPerformers } = await supabase
    .from("performers")
    .select("id, name, slug, photo_url");

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

  for (const [key, artist] of artistsSeen) {
    let existing = existingMap.get(key);
    if (!existing) {
      const slug = slugify(artist.name);
      existing = existingMap.get(slug);
    }
    if (!existing && existingPerformers) {
      existing = existingPerformers.find((p) => namesMatch(p.name, artist.name)) || undefined;
    }

    let performerId: string;

    if (existing) {
      // Update photo if missing
      if (artist.image && !existing.photo_url) {
        await supabase.from("performers").update({ photo_url: artist.image }).eq("id", existing.id);
        updatedPerformers++;
      }
      performerId = existing.id;
    } else {
      const { data: newP, error } = await supabase
        .from("performers")
        .insert({
          name: artist.name,
          slug: slugify(artist.name),
          city: "Chicago",
          genres: ["electronic"],
          photo_url: artist.image || null,
          claimed: false,
        })
        .select("id")
        .single();

      if (error) {
        const { data: retry } = await supabase
          .from("performers")
          .insert({
            name: artist.name,
            slug: `${slugify(artist.name)}-dice`,
            city: "Chicago",
            genres: ["electronic"],
            photo_url: artist.image || null,
            claimed: false,
          })
          .select("id")
          .single();

        if (!retry) continue;
        performerId = retry.id;
      } else {
        performerId = newP!.id;
      }
      newPerformers++;
    }

    // Insert events
    for (const ev of artist.events) {
      if (!ev.date) continue;

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
            }
          }
        }
      }

      // Check for duplicate
      const { data: existingEvent } = await supabase
        .from("events")
        .select("id")
        .eq("performer_id", performerId)
        .eq("event_date", ev.date)
        .eq("source", "dice")
        .maybeSingle();

      if (!existingEvent) {
        const { error: evErr } = await supabase.from("events").insert({
          performer_id: performerId,
          venue_id: venueId,
          event_date: ev.date,
          source: "dice",
          external_url: ev.url || null,
        });
        if (!evErr) totalEventsInserted++;
      }
    }
  }

  log("dice", "\n=== DICE SCRAPE RESULTS ===");
  log("dice", `Events fetched: ${allEvents.length} (${uniqueEvents.length} unique)`);
  log("dice", `Unique artists: ${artistsSeen.size}`);
  log("dice", `New performers added: ${newPerformers}`);
  log("dice", `Existing performers updated: ${updatedPerformers}`);
  log("dice", `Events inserted: ${totalEventsInserted}`);

  // Target venue breakdown
  log("dice", "\n--- Venue Hits ---");
  const venueCounts = new Map<string, number>();
  for (const e of uniqueEvents) {
    const v = e.venue || "Unknown";
    venueCounts.set(v, (venueCounts.get(v) || 0) + 1);
  }
  const sorted = [...venueCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [v, c] of sorted.slice(0, 15)) {
    log("dice", `  ${v}: ${c}`);
  }
}

if (require.main === module) {
  scrapeDICE().catch(console.error);
}
