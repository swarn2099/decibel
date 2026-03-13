import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import { getBrowser, closeBrowser } from './browser';
import type { ScrapeRequest } from './types';
import { queryDB } from './layers/layer1-db';
import { queryEventAPIs } from './layers/layer2-apis';
import { reverseGeocode } from './layers/layer3-places';
import { scrapeVenueWebsite } from './layers/layer5-website';
import { queryLLMForLineup } from './layers/layer6-llm';
import { writeSearchResult } from './write-result';
import { mergeResults } from './confidence';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4001', 10);
const SCRAPER_SHARED_SECRET = process.env.SCRAPER_SHARED_SECRET;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Middleware
app.use(express.json());
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-scraper-secret');
  next();
});

// Auth middleware for /scrape endpoint
function requireScraperSecret(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers['x-scraper-secret'];
  if (!SCRAPER_SHARED_SECRET) {
    console.error('[auth] SCRAPER_SHARED_SECRET env var not set');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }
  if (!provided || provided !== SCRAPER_SHARED_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// GET /health — liveness check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// POST /scrape — main scrape waterfall (Layers 1, 2, 3, 5, 6)
app.post('/scrape', requireScraperSecret, async (req: Request, res: Response) => {
  const body = req.body as Partial<ScrapeRequest>;

  // Validate required fields
  if (!body.searchId || !body.userId || body.lat === undefined || body.lng === undefined || !body.localDate) {
    res.status(400).json({
      error: 'Missing required fields: searchId, userId, lat, lng, localDate',
    });
    return;
  }

  const { searchId, userId, lat, lng, localDate, venueName } = body as ScrapeRequest;

  console.log(`[scrape] Request received searchId=${searchId} lat=${lat} lng=${lng} date=${localDate} venue=${venueName ?? 'unknown'}`);

  // 202 immediately — scraping is async, mobile listens via Realtime
  res.status(202).json({ status: 'accepted', searchId });

  // Run waterfall in background (res already sent)
  runScrapeWaterfall({ searchId, userId, lat, lng, localDate, venueName }).catch((err) => {
    console.error(`[scrape] Waterfall failed for searchId=${searchId}:`, err);
  });
});

/**
 * Full scrape waterfall:
 * Layer 1 (DB) → [Layer 3 + Layer 2 in parallel] → Layer 5 (Playwright) → Layer 6 (LLM) → fallback empty
 *
 * Every path MUST write to search_results — the mobile client is waiting on Realtime.
 * Layers 1-3 target: respond within 10 seconds.
 */
async function runScrapeWaterfall(req: ScrapeRequest): Promise<void> {
  const { searchId, userId, lat, lng, localDate, venueName } = req;
  const handlerStart = Date.now();

  try {
  // ─── Layer 1: DB lookup ────────────────────────────────────────────────────
  const l1Start = Date.now();
  console.log(`[waterfall] Layer 1 starting for searchId=${searchId}`);
  const layer1Result = await queryDB(lat, lng, localDate);
  console.log(`[waterfall] Layer 1: ${Date.now() - l1Start}ms`);

  if (layer1Result && layer1Result.artists.length > 0) {
    console.log(`[waterfall] Layer 1 HIT — writing result and stopping (${Date.now() - handlerStart}ms total)`);
    await writeSearchResult(searchId, userId, layer1Result);
    return;
  }

  console.log(`[waterfall] Layer 1 MISS — running Layers 2+3 in parallel`);

  // ─── Layers 2+3 in parallel ────────────────────────────────────────────────
  const l23Start = Date.now();
  const [geocodeResult, apiResults] = await Promise.all([
    reverseGeocode(lat, lng),
    // Layer 2 needs at least city context — we'll pass what we have from the request
    queryEventAPIs(venueName ?? null, null, localDate, lat, lng),
  ]);
  console.log(`[waterfall] Layers 2+3 parallel: ${Date.now() - l23Start}ms`);

  const { city, venueName: geocodedVenueName } = geocodeResult;
  const effectiveVenueName = venueName ?? geocodedVenueName ?? null;

  console.log(`[waterfall] Layer 3: city="${city}" venue="${effectiveVenueName}"`);

  // Layer 2: pick best result from all fulfilled API sources
  if (apiResults.length > 0) {
    const bestLayer2 = mergeResults(apiResults);
    if (bestLayer2.artists.length > 0) {
      console.log(`[waterfall] Layer 2 HIT via ${bestLayer2.source} — writing result and stopping (${Date.now() - handlerStart}ms total)`);
      // Enrich with geocoded venue name if Layer 2 didn't return one
      if (!bestLayer2.venue_name && effectiveVenueName) {
        bestLayer2.venue_name = effectiveVenueName;
      }
      await writeSearchResult(searchId, userId, bestLayer2);
      return;
    }
  }

  console.log(`[waterfall] Layers 1-3 MISS — returning no_results_layers_1_3, continuing to Layers 5+6`);

  // ─── Layer 5: Playwright venue website scrape ─────────────────────────────
  // Only if we have a venue name and can look up its website from DB
  let layer5Result = null;
  if (effectiveVenueName) {
    console.log(`[waterfall] Layer 5 starting for "${effectiveVenueName}"`);
    const venueWebsite = await getVenueWebsite(effectiveVenueName, lat, lng);

    if (venueWebsite) {
      layer5Result = await scrapeVenueWebsite(venueWebsite, effectiveVenueName, localDate);
    } else {
      console.log(`[waterfall] Layer 5: no website URL found for "${effectiveVenueName}"`);
    }
  } else {
    console.log(`[waterfall] Layer 5 skipped — no venue name available`);
  }

  if (layer5Result && layer5Result.artists.length > 0) {
    console.log(`[waterfall] Layer 5 HIT — writing result and stopping`);
    await writeSearchResult(searchId, userId, layer5Result);
    return;
  }

  console.log(`[waterfall] Layer 5 MISS — continuing to Layer 6`);

  // ─── Layer 6: Claude LLM web search ──────────────────────────────────────
  let layer6Result = null;
  if (effectiveVenueName && city) {
    console.log(`[waterfall] Layer 6 starting for "${effectiveVenueName}" in ${city}`);
    layer6Result = await queryLLMForLineup(effectiveVenueName, city, localDate);
  } else {
    console.log(`[waterfall] Layer 6 skipped — missing venue name (${effectiveVenueName}) or city (${city})`);
  }

  if (layer6Result && layer6Result.artists.length > 0) {
    console.log(`[waterfall] Layer 6 HIT — writing result and stopping`);
    await writeSearchResult(searchId, userId, layer6Result);
    return;
  }

  // ─── All layers missed — write empty low-confidence result ────────────────
  console.log(`[waterfall] All layers missed for searchId=${searchId} — writing empty result (${Date.now() - handlerStart}ms total)`);
  await writeSearchResult(searchId, userId, {
    confidence: 'low',
    venue_name: effectiveVenueName ?? null,
    venue_id: null,
    artists: [],
    source: 'none',
  });

  } catch (err: unknown) {
    // Safety net — on any unhandled error, write a low-confidence empty result
    // so the mobile client receives SOMETHING back rather than hanging forever
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[waterfall] Unhandled error for searchId=${searchId}: ${message}`);
    try {
      await writeSearchResult(searchId, userId, {
        confidence: 'low',
        venue_name: venueName ?? null,
        venue_id: null,
        artists: [],
        source: 'error',
      });
    } catch (writeErr) {
      console.error('[waterfall] Failed to write error fallback result:', writeErr);
    }
  }
}

/**
 * Look up a venue's website URL from the DB by name proximity or GPS match.
 * Returns null if no website is found.
 */
async function getVenueWebsite(venueName: string, lat: number, lng: number): Promise<string | null> {
  try {
    // Try GPS-based lookup first (most accurate)
    const { data: venues } = await supabase
      .from('venues')
      .select('id, name, website_url, latitude, longitude')
      .not('website_url', 'is', null);

    if (!venues || venues.length === 0) return null;

    // Find nearest venue with a website URL
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    function haversine(lat2: number, lng2: number): number {
      const dLat = toRad(lat2 - lat);
      const dLng = toRad(lng2 - lng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    }

    // GPS match within 200m
    const gpsMatch = venues.find((v) => {
      if (v.latitude == null || v.longitude == null) return false;
      return haversine(v.latitude, v.longitude) <= 200;
    });

    if (gpsMatch?.website_url) {
      console.log(`[waterfall] Found venue website via GPS: "${gpsMatch.name}" → ${gpsMatch.website_url}`);
      return gpsMatch.website_url as string;
    }

    // Fallback: name substring match
    const nameLower = venueName.toLowerCase();
    const nameMatch = venues.find((v) =>
      v.name?.toLowerCase().includes(nameLower) || nameLower.includes(v.name?.toLowerCase() ?? '')
    );

    if (nameMatch?.website_url) {
      console.log(`[waterfall] Found venue website via name: "${nameMatch.name}" → ${nameMatch.website_url}`);
      return nameMatch.website_url as string;
    }

    return null;
  } catch (err) {
    console.error('[waterfall] Error looking up venue website:', err);
    return null;
  }
}

// Startup: warm the shared Playwright browser
async function start(): Promise<void> {
  try {
    await getBrowser();
    console.log('[server] Playwright browser warmed');
  } catch (err) {
    console.error('[server] Failed to warm browser on startup:', err);
    // Non-fatal: browser will retry on first request via getBrowser()
  }

  app.listen(PORT, () => {
    console.log(`[server] Decibel scraper listening on port ${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[server] SIGINT received — shutting down');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[server] SIGTERM received — shutting down');
  await closeBrowser();
  process.exit(0);
});

start();

export default app;
