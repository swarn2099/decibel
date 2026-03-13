/**
 * Layer 2: Event platform API queries (RA, DICE, EDMTrain, Songkick, Bandsintown).
 *
 * All sources run in parallel via Promise.allSettled() with per-source timeouts.
 * Each source handles its own errors and returns null on failure — never throws.
 * DICE build ID is fetched fresh per request (not cached at startup).
 *
 * Layer 4 (social media scraping) is OUT OF SCOPE per REQUIREMENTS.md.
 */

import type { ScrapeResult, ScrapedArtist } from '../types';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function makeTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
}

function fuzzyVenueMatch(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// RA (Resident Advisor) — GraphQL
// ---------------------------------------------------------------------------

const RA_GRAPHQL = 'https://ra.co/graphql';

const RA_EVENTS_QUERY = `
query GetEventsByDate($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
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
        }
      }
    }
    totalResults
  }
}`;

interface RAEventListing {
  id: string;
  event: {
    id: string;
    title: string;
    date: string;
    venue: { id: string; name: string } | null;
    artists: {
      id: string;
      name: string;
      urlSafeName: string;
      soundcloud: string | null;
    }[];
  };
}

async function queryRA(
  venueName: string | null,
  city: string | null,
  date: string
): Promise<ScrapeResult | null> {
  try {
    // RA uses area IDs. Map common US city names to area IDs.
    // Chicago = 17, New York = 7, Los Angeles = 2, San Francisco = 4
    // For unknown cities, use a broad US query (areaType: country, US = 236)
    const cityAreaMap: Record<string, number> = {
      chicago: 17,
      'new york': 7,
      'new york city': 7,
      nyc: 7,
      'los angeles': 2,
      la: 2,
      'san francisco': 4,
      sf: 4,
      detroit: 19,
      berlin: 8,
      london: 1,
    };

    const cityKey = (city ?? '').toLowerCase().trim();
    const areaId = cityAreaMap[cityKey];

    // Build date filter — RA uses ISO timestamp format
    const dateFilter = `${date}T00:00:00.000`;
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().slice(0, 10);
    const nextDayFilter = `${nextDayStr}T00:00:00.000`;

    const filters: Record<string, unknown> = {
      listingDate: { gte: dateFilter, lte: nextDayFilter },
    };

    if (areaId) {
      filters['areas'] = { eq: areaId };
    }

    const res = await fetch(RA_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://ra.co/events',
      },
      body: JSON.stringify({
        query: RA_EVENTS_QUERY,
        variables: { filters, pageSize: 50, page: 1 },
      }),
    });

    if (!res.ok) {
      console.warn(`[layer2:ra] HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    if (json.errors) {
      console.warn('[layer2:ra] GraphQL errors:', json.errors[0]?.message);
      return null;
    }

    const listings: RAEventListing[] = (
      json.data?.eventListings?.data ?? []
    ).filter((d: any) => d?.event);

    if (listings.length === 0) {
      console.log('[layer2:ra] No events found for date/area');
      return null;
    }

    // If we have a venue name hint, try to find a matching event
    let matchedListing: RAEventListing | null = null;
    let isExactVenueMatch = false;

    if (venueName) {
      for (const listing of listings) {
        const raVenue = listing.event.venue?.name ?? '';
        if (fuzzyVenueMatch(raVenue, venueName)) {
          matchedListing = listing;
          isExactVenueMatch = true;
          break;
        }
      }
    }

    // Fall back to any event on that date with artists
    if (!matchedListing) {
      matchedListing = listings.find((l) => l.event.artists.length > 0) ?? null;
    }

    if (!matchedListing) return null;

    const artists: ScrapedArtist[] = matchedListing.event.artists.map((a) => ({
      name: a.name,
      performer_id: null,
      platform_url: a.soundcloud
        ? a.soundcloud.startsWith('http')
          ? a.soundcloud
          : `https://soundcloud.com/${a.soundcloud}`
        : a.urlSafeName
        ? `https://ra.co/dj/${a.urlSafeName}`
        : null,
    }));

    if (artists.length === 0) return null;

    const confidence = isExactVenueMatch ? 'high' : 'medium';
    const eventVenueName = matchedListing.event.venue?.name ?? null;

    console.log(
      `[layer2:ra] Found ${artists.length} artists at "${eventVenueName}" (confidence=${confidence})`
    );

    return {
      confidence,
      venue_name: eventVenueName,
      venue_id: null,
      artists,
      source: 'ra',
    };
  } catch (err: any) {
    console.warn('[layer2:ra] Error:', err?.message ?? err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// DICE — _next/data scrape (build ID fetched fresh per request)
// ---------------------------------------------------------------------------

async function getDiceBuildId(): Promise<string | null> {
  try {
    const res = await fetch('https://dice.fm/venue/spybar-pm7k', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    const match = html.match(/"buildId":"([^"]+)"/);
    return match ? match[1] : null;
  } catch (err: any) {
    console.warn('[layer2:dice] Could not fetch build ID:', err?.message ?? err);
    return null;
  }
}

interface DiceEventRaw {
  name: string;
  dates?: { event_start_date?: string };
  venues?: { name?: string; address?: string }[];
  summary_lineup?: { top_artists?: { name?: string; image?: { url?: string } }[] };
  perm_name?: string;
}

async function queryDICE(
  venueName: string | null,
  city: string | null,
  date: string
): Promise<ScrapeResult | null> {
  try {
    const buildId = await getDiceBuildId();
    if (!buildId) {
      console.warn('[layer2:dice] No build ID — skipping');
      return null;
    }

    // DICE uses city slugs — map common city names
    const citySlugMap: Record<string, string> = {
      chicago: 'chicago-5b238ca66e4bcd93783835b0',
      'new york': 'new-york-528458837c9b7e54a04c9b78',
      'new york city': 'new-york-528458837c9b7e54a04c9b78',
      nyc: 'new-york-528458837c9b7e54a04c9b78',
      'los angeles': 'los-angeles-5b238ca66e4bcd9378383a93',
      la: 'los-angeles-5b238ca66e4bcd9378383a93',
      london: 'london-5b238ca66e4bcd9378383600',
      berlin: 'berlin-5b238ca66e4bcd9378383a8c',
    };

    const cityKey = (city ?? '').toLowerCase().trim();
    const citySlug = citySlugMap[cityKey] ?? 'chicago-5b238ca66e4bcd93783835b0';

    const url = `https://dice.fm/_next/data/${buildId}/en/browse/${citySlug}/music/dj.json?date=${date}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      console.warn(`[layer2:dice] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const rawEvents: DiceEventRaw[] = data.pageProps?.events ?? [];

    if (rawEvents.length === 0) {
      console.log('[layer2:dice] No events in response');
      return null;
    }

    // Filter events for the target date
    const targetEvents = rawEvents.filter((e) => {
      const eventDate = e.dates?.event_start_date?.slice(0, 10);
      return eventDate === date;
    });

    const pool = targetEvents.length > 0 ? targetEvents : rawEvents;

    // Find venue match if hint provided
    let bestEvent: DiceEventRaw | null = null;
    if (venueName) {
      bestEvent =
        pool.find((e) => {
          const ev = e.venues?.[0]?.name ?? '';
          return fuzzyVenueMatch(ev, venueName);
        }) ?? null;
    }
    if (!bestEvent) {
      bestEvent = pool.find((e) => (e.summary_lineup?.top_artists?.length ?? 0) > 0) ?? null;
    }

    if (!bestEvent) return null;

    const topArtists = bestEvent.summary_lineup?.top_artists ?? [];
    const artists: ScrapedArtist[] = topArtists
      .filter((a) => a.name && a.name.length > 1)
      .map((a) => ({
        name: a.name!,
        performer_id: null,
        platform_url: bestEvent?.perm_name
          ? `https://dice.fm/event/${bestEvent.perm_name}`
          : null,
      }));

    if (artists.length === 0) return null;

    const eventVenueName = bestEvent.venues?.[0]?.name ?? null;
    const confidence =
      venueName && eventVenueName && fuzzyVenueMatch(eventVenueName, venueName)
        ? 'high'
        : 'medium';

    console.log(
      `[layer2:dice] Found ${artists.length} artists at "${eventVenueName}" (confidence=${confidence})`
    );

    return {
      confidence,
      venue_name: eventVenueName,
      venue_id: null,
      artists,
      source: 'dice',
    };
  } catch (err: any) {
    console.warn('[layer2:dice] Error:', err?.message ?? err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// EDMTrain — REST API
// ---------------------------------------------------------------------------

interface EDMTrainEvent {
  name?: string;
  date?: string;
  venue?: { name?: string; id?: number };
  artists?: { name?: string }[];
}

async function queryEDMTrain(
  lat: number,
  lng: number,
  date: string
): Promise<ScrapeResult | null> {
  try {
    const url = `https://edmtrain.com/api/events?latitude=${lat}&longitude=${lng}&date=${date}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Decibel/1.0 (decible.live)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`[layer2:edmtrain] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const events: EDMTrainEvent[] = data?.data ?? data ?? [];

    if (!Array.isArray(events) || events.length === 0) {
      console.log('[layer2:edmtrain] No events in response');
      return null;
    }

    // Pick the first event with artists
    const eventWithArtists = events.find((e) => (e.artists?.length ?? 0) > 0);
    if (!eventWithArtists) return null;

    const artists: ScrapedArtist[] = (eventWithArtists.artists ?? [])
      .filter((a) => a.name && a.name.length > 1)
      .map((a) => ({
        name: a.name!,
        performer_id: null,
        platform_url: null,
      }));

    if (artists.length === 0) return null;

    const venueName = eventWithArtists.venue?.name ?? null;
    console.log(`[layer2:edmtrain] Found ${artists.length} artists at "${venueName}"`);

    return {
      confidence: 'medium',
      venue_name: venueName,
      venue_id: null,
      artists,
      source: 'edmtrain',
    };
  } catch (err: any) {
    console.warn('[layer2:edmtrain] Error:', err?.message ?? err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Songkick — REST API (post-acquisition, uncertain status — 3s timeout)
// ---------------------------------------------------------------------------

interface SongkickEvent {
  displayName?: string;
  start?: { date?: string };
  venue?: { displayName?: string };
  performance?: { artist?: { displayName?: string } }[];
}

async function querySongkick(lat: number, lng: number, date: string): Promise<ScrapeResult | null> {
  try {
    // Songkick requires an API key — check if configured
    const apiKey = process.env.SONGKICK_API_KEY;
    if (!apiKey) {
      console.log('[layer2:songkick] No API key configured — skipping');
      return null;
    }

    const url = `https://api.songkick.com/api/3.0/events.json?apikey=${apiKey}&location=geo:${lat},${lng}&min_date=${date}&max_date=${date}&per_page=10`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Decibel/1.0 (decible.live)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`[layer2:songkick] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const events: SongkickEvent[] =
      data?.resultsPage?.results?.event ?? [];

    if (events.length === 0) {
      console.log('[layer2:songkick] No events in response');
      return null;
    }

    const eventWithPerformers = events.find(
      (e) => (e.performance?.length ?? 0) > 0
    );
    if (!eventWithPerformers) return null;

    const artists: ScrapedArtist[] = (eventWithPerformers.performance ?? [])
      .filter((p) => p.artist?.displayName)
      .map((p) => ({
        name: p.artist!.displayName!,
        performer_id: null,
        platform_url: null,
      }));

    if (artists.length === 0) return null;

    const venueName = eventWithPerformers.venue?.displayName ?? null;
    console.log(`[layer2:songkick] Found ${artists.length} artists at "${venueName}"`);

    return {
      confidence: 'medium',
      venue_name: venueName,
      venue_id: null,
      artists,
      source: 'songkick',
    };
  } catch (err: any) {
    console.warn('[layer2:songkick] Error:', err?.message ?? err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bandsintown — REST API (3s timeout)
// ---------------------------------------------------------------------------

interface BandsintownEvent {
  title?: string;
  datetime?: string;
  venue?: { name?: string; city?: string };
  lineup?: string[];
  offers?: { url?: string }[];
}

async function queryBandsintown(lat: number, lng: number, date: string): Promise<ScrapeResult | null> {
  try {
    const appId = process.env.BANDSINTOWN_APP_ID ?? 'decibel-app';
    const url = `https://rest.bandsintown.com/v4/events/search?location=${lat},${lng}&date=${date}&app_id=${appId}&radius=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Decibel/1.0 (decible.live)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`[layer2:bandsintown] HTTP ${res.status}`);
      return null;
    }

    const events: BandsintownEvent[] = await res.json();

    if (!Array.isArray(events) || events.length === 0) {
      console.log('[layer2:bandsintown] No events in response');
      return null;
    }

    const eventWithLineup = events.find((e) => (e.lineup?.length ?? 0) > 0);
    if (!eventWithLineup) return null;

    const artists: ScrapedArtist[] = (eventWithLineup.lineup ?? [])
      .filter((name) => name && name.length > 1)
      .map((name) => ({
        name,
        performer_id: null,
        platform_url: eventWithLineup.offers?.[0]?.url ?? null,
      }));

    if (artists.length === 0) return null;

    const venueName = eventWithLineup.venue?.name ?? null;
    console.log(`[layer2:bandsintown] Found ${artists.length} artists at "${venueName}"`);

    return {
      confidence: 'medium',
      venue_name: venueName,
      venue_id: null,
      artists,
      source: 'bandsintown',
    };
  } catch (err: any) {
    console.warn('[layer2:bandsintown] Error:', err?.message ?? err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main export: queryEventAPIs
// ---------------------------------------------------------------------------

/**
 * Query all 5 event API sources in parallel with per-source timeouts.
 * Returns all fulfilled results (caller picks best via confidence.ts mergeResults).
 * Never throws — each source is independently failable.
 */
export async function queryEventAPIs(
  venueName: string | null,
  city: string | null,
  date: string,
  lat: number,
  lng: number
): Promise<ScrapeResult[]> {
  const TIMEOUT_MS = 5000;
  const SHORT_TIMEOUT_MS = 3000;

  const sources = [
    Promise.race([queryRA(venueName, city, date), makeTimeout(TIMEOUT_MS)]),
    Promise.race([queryDICE(venueName, city, date), makeTimeout(TIMEOUT_MS)]),
    Promise.race([queryEDMTrain(lat, lng, date), makeTimeout(TIMEOUT_MS)]),
    Promise.race([querySongkick(lat, lng, date), makeTimeout(SHORT_TIMEOUT_MS)]),
    Promise.race([queryBandsintown(lat, lng, date), makeTimeout(SHORT_TIMEOUT_MS)]),
  ];

  const settled = await Promise.allSettled(sources);

  const results: ScrapeResult[] = [];
  const labels = ['ra', 'dice', 'edmtrain', 'songkick', 'bandsintown'];

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    if (s.status === 'fulfilled' && s.value) {
      results.push(s.value as ScrapeResult);
    } else if (s.status === 'rejected') {
      console.warn(`[layer2:${labels[i]}] Rejected:`, s.reason?.message ?? s.reason);
    }
  }

  console.log(`[layer2] Parallel query complete: ${results.length}/${settled.length} sources returned results`);
  return results;
}
