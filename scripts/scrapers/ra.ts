/**
 * RA GraphQL Scraper: Fetches Chicago event listings from Resident Advisor's
 * GraphQL API for the last 12 months. Extracts artists, venues, genres,
 * and social links. Cross-references against existing DB performers.
 *
 * Chicago area ID: 17
 * Key filter: listingDate (not date) for date range queries
 */
import { getSupabase, slugify, namesMatch, log, logError, isNonArtistName, normalizeInstagramHandle } from "./utils";

const RA_GRAPHQL = "https://ra.co/graphql";
const CHICAGO_AREA_ID = 17;
const PAGE_SIZE = 50;
const DELAY_MS = 800; // be polite

interface RAEvent {
  id: string;
  title: string;
  date: string;
  venue: { id: string; name: string } | null;
  artists: {
    id: string;
    name: string;
    urlSafeName: string;
    soundcloud: string | null;
    instagram: string | null;
    image: string | null;
  }[];
  genres: { id: string; name: string }[];
}

const EVENT_QUERY = `
query GetChicagoEvents($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
  eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
    data {
      id
      event {
        id
        title
        date
        venue { id name }
        artists {
          id
          name
          urlSafeName
          soundcloud
          instagram
          image
        }
        genres { id name }
      }
    }
    totalResults
  }
}`;

async function fetchPage(page: number, dateFrom: string): Promise<{ events: RAEvent[]; total: number }> {
  const res = await fetch(RA_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://ra.co/events/us/chicago",
    },
    body: JSON.stringify({
      query: EVENT_QUERY,
      variables: {
        filters: {
          areas: { eq: CHICAGO_AREA_ID },
          listingDate: { gte: dateFrom },
        },
        pageSize: PAGE_SIZE,
        page,
      },
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  if (json.errors) {
    throw new Error(json.errors.map((e: any) => e.message).join("; "));
  }

  const listings = json.data?.eventListings;
  const events: RAEvent[] = (listings?.data || []).map((d: any) => d.event).filter(Boolean);
  return { events, total: listings?.totalResults || 0 };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Target venue name matching — map RA venue names to our DB slugs
const VENUE_NAME_MAP: Record<string, string> = {
  "smartbar": "smartbar",
  "smart bar": "smartbar",
  "spybar": "spybar",
  "spy bar": "spybar",
  "primary": "primary",
  "309 n morgan": "311-n-morgan-st",
  "309 n. morgan": "311-n-morgan-st",
  "morgan mfg": "morgan-mfg",
  "podlasie": "podlasie",
  "podlasie club": "podlasie",
  "sound-bar": "sound-bar-chicago",
  "sound bar": "sound-bar-chicago",
  "soundbar": "sound-bar-chicago",
  "concord music hall": "concord-music-hall",
  "radius chicago": "radius",
  "radius": "radius",
  "cermak hall": "cermak-hall-at-radius",
  "prysm": "prysm",
  "prysm nightclub": "prysm",
  "the mid": "the-mid",
};

function matchVenueSlug(raVenueName: string): string | null {
  const lower = raVenueName.toLowerCase().trim();
  for (const [pattern, slug] of Object.entries(VENUE_NAME_MAP)) {
    if (lower === pattern || lower.startsWith(pattern + " ") || lower.includes(pattern)) {
      return slug;
    }
  }
  return null;
}

export async function scrapeRA() {
  const supabase = getSupabase();

  // Calculate date 12 months ago
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const dateFrom = twelveMonthsAgo.toISOString().split(".")[0] + ".000";

  log("ra", `Fetching Chicago events from RA since ${dateFrom.slice(0, 10)}`);

  // Step 1: Fetch all events via pagination
  const allEvents: RAEvent[] = [];
  let page = 1;
  let total = 0;

  const { events: firstPage, total: totalResults } = await fetchPage(page, dateFrom);
  allEvents.push(...firstPage);
  total = totalResults;
  log("ra", `Total events available: ${total}`);

  const totalPages = Math.ceil(Math.min(total, 10000) / PAGE_SIZE);
  log("ra", `Fetching ${totalPages} pages...`);

  while (page < totalPages) {
    page++;
    await sleep(DELAY_MS);
    try {
      const { events } = await fetchPage(page, dateFrom);
      if (events.length === 0) break;
      allEvents.push(...events);
      if (page % 10 === 0) {
        log("ra", `  Page ${page}/${totalPages} — ${allEvents.length} events so far`);
      }
    } catch (err) {
      logError("ra", `Page ${page} failed`, err);
      // Continue to next page
    }
  }

  log("ra", `Fetched ${allEvents.length} events total`);

  // Step 2: Collect unique artists and venues
  const artistsSeen = new Map<string, {
    name: string;
    raSlug: string;
    soundcloud: string | null;
    instagram: string | null;
    image: string | null;
    events: { date: string; venue: string | null; title: string; genres: string[] }[];
  }>();

  const venuesSeen = new Map<string, string>(); // RA venue name -> our slug or null

  for (const event of allEvents) {
    const venueName = event.venue?.name || null;

    for (const artist of event.artists) {
      if (!artist.name || artist.name.length < 2) continue;
      if (isNonArtistName(artist.name)) continue;

      const key = artist.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!artistsSeen.has(key)) {
        artistsSeen.set(key, {
          name: artist.name,
          raSlug: artist.urlSafeName || "",
          soundcloud: artist.soundcloud || null,
          instagram: artist.instagram || null,
          image: artist.image || null,
          events: [],
        });
      }

      const entry = artistsSeen.get(key)!;
      // Update social links if we get new ones
      if (artist.soundcloud && !entry.soundcloud) entry.soundcloud = artist.soundcloud;
      if (artist.instagram && !entry.instagram) entry.instagram = artist.instagram;
      if (artist.image && !entry.image) entry.image = artist.image;

      entry.events.push({
        date: event.date?.slice(0, 10) || "",
        venue: venueName,
        title: event.title,
        genres: event.genres.map((g) => g.name.toLowerCase()),
      });
    }

    if (venueName) {
      const slug = matchVenueSlug(venueName);
      if (slug) venuesSeen.set(venueName, slug);
    }
  }

  log("ra", `Unique artists: ${artistsSeen.size}`);
  log("ra", `Matched venues: ${venuesSeen.size}`);

  // Step 3: Cross-reference with DB and upsert
  let newPerformers = 0;
  let updatedPerformers = 0;
  let totalEventsInserted = 0;
  let skipped = 0;

  // Pre-fetch all existing performers for efficient matching
  const { data: existingPerformers } = await supabase
    .from("performers")
    .select("id, name, slug, soundcloud_url, instagram_handle, photo_url, ra_url, genres");

  const existingMap = new Map<string, typeof existingPerformers extends (infer T)[] | null ? T : never>();
  for (const p of existingPerformers || []) {
    const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    existingMap.set(key, p);
    // Also map by slug for backup matching
    existingMap.set(p.slug, p);
  }

  // Pre-fetch venue IDs
  const { data: dbVenues } = await supabase.from("venues").select("id, slug, name");
  const venueIdMap = new Map<string, string>();
  for (const v of dbVenues || []) {
    venueIdMap.set(v.slug, v.id);
    venueIdMap.set(v.name.toLowerCase(), v.id);
  }

  let processed = 0;
  const totalArtists = artistsSeen.size;

  for (const [key, artist] of artistsSeen) {
    processed++;
    if (processed % 50 === 0) {
      log("ra", `  Processing ${processed}/${totalArtists}...`);
    }

    // Find existing performer
    let existing = existingMap.get(key);
    if (!existing) {
      // Try slug-based match
      const slug = slugify(artist.name);
      existing = existingMap.get(slug);
    }
    if (!existing && existingPerformers) {
      // Fuzzy match
      existing = existingPerformers.find((p) => namesMatch(p.name, artist.name)) || undefined;
    }

    // Collect genres from all events
    const allGenres = new Set<string>();
    for (const ev of artist.events) {
      for (const g of ev.genres) allGenres.add(g);
    }

    const raUrl = artist.raSlug ? `https://ra.co/dj/${artist.raSlug}` : null;

    let performerId: string;

    if (existing) {
      // Update existing performer with RA data if we have new info
      const updates: Record<string, any> = {};
      if (raUrl && !existing.ra_url) updates.ra_url = raUrl;
      if (artist.soundcloud && !existing.soundcloud_url) {
        updates.soundcloud_url = artist.soundcloud.startsWith("http")
          ? artist.soundcloud
          : `https://soundcloud.com/${artist.soundcloud}`;
      }
      if (artist.instagram && !existing.instagram_handle) {
        updates.instagram_handle = normalizeInstagramHandle(artist.instagram);
      }
      if (artist.image && !existing.photo_url) updates.photo_url = artist.image;

      // Merge genres
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
      const scUrl = artist.soundcloud
        ? (artist.soundcloud.startsWith("http") ? artist.soundcloud : `https://soundcloud.com/${artist.soundcloud}`)
        : null;

      const { data: newP, error } = await supabase
        .from("performers")
        .insert({
          name: artist.name,
          slug: slugify(artist.name),
          city: "Chicago",
          genres: [...allGenres].slice(0, 5) || ["electronic"],
          soundcloud_url: scUrl,
          instagram_handle: artist.instagram ? normalizeInstagramHandle(artist.instagram) : null,
          ra_url: raUrl,
          photo_url: artist.image || null,
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
            slug: `${slugify(artist.name)}-ra`,
            city: "Chicago",
            genres: [...allGenres].slice(0, 5) || ["electronic"],
            soundcloud_url: scUrl,
            instagram_handle: artist.instagram ? normalizeInstagramHandle(artist.instagram) : null,
            ra_url: raUrl,
            photo_url: artist.image || null,
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
        if (!venueId) {
          // Try direct name match
          venueId = venueIdMap.get(ev.venue.toLowerCase()) || null;
        }
        if (!venueId) {
          // Create venue
          const vSlug = slugify(ev.venue);
          const existingVenueId = venueIdMap.get(vSlug);
          if (existingVenueId) {
            venueId = existingVenueId;
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
        .eq("source", "ra")
        .maybeSingle();

      if (!existingEvent) {
        const { error: evErr } = await supabase.from("events").insert({
          performer_id: performerId,
          venue_id: venueId,
          event_date: ev.date,
          source: "ra",
        });
        if (!evErr) totalEventsInserted++;
      }
    }
  }

  // Stats
  log("ra", "\n=== RA SCRAPE RESULTS ===");
  log("ra", `Events fetched from API: ${allEvents.length}`);
  log("ra", `Unique artists found: ${artistsSeen.size}`);
  log("ra", `New performers added: ${newPerformers}`);
  log("ra", `Existing performers updated: ${updatedPerformers}`);
  log("ra", `Events inserted: ${totalEventsInserted}`);
  log("ra", `Skipped (errors): ${skipped}`);

  // Show target venue breakdown
  log("ra", "\n--- Target Venue Hits ---");
  const targetVenues = ["smartbar", "spybar", "primary", "podlasie", "309 n morgan", "sound-bar", "concord music hall", "radius", "the mid", "prysm"];
  for (const tv of targetVenues) {
    const count = allEvents.filter((e) =>
      e.venue?.name && e.venue.name.toLowerCase().includes(tv)
    ).length;
    if (count > 0) log("ra", `  ${tv}: ${count} events`);
  }
}

if (require.main === module) {
  scrapeRA().catch(console.error);
}
