import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import { getBrowser, closeBrowser } from './browser';
import type { ScrapeRequest } from './types';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4001', 10);
const SCRAPER_SHARED_SECRET = process.env.SCRAPER_SHARED_SECRET;

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

// POST /scrape — main scrape endpoint (layers 2-6 added in Plans 02+03)
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

  // 202 Accepted — actual scraping layers (2-6) will be added in Plans 02+03
  // For now we acknowledge and log so PM2/health/auth can be verified end-to-end
  res.status(202).json({ status: 'accepted', searchId });
});

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
