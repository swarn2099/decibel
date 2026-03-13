import { scrapeWithBrowser } from '../browser';
import type { ScrapeResult } from '../types';

/**
 * Layer 5 — Playwright venue website scrape.
 * Opens the venue's own website and extracts artist/DJ names near today's date.
 * Returns medium confidence — we found names on the venue's own site but they're heuristic-extracted.
 *
 * Returns null on any error or if no lineup text is found.
 */
export async function scrapeVenueWebsite(
  venueUrl: string,
  venueName: string,
  date: string // YYYY-MM-DD
): Promise<ScrapeResult | null> {
  const scrapePromise = (async (): Promise<ScrapeResult | null> => {
    return scrapeWithBrowser(async (page) => {
      try {
        await page.goto(venueUrl, { waitUntil: 'networkidle', timeout: 8000 });
      } catch {
        // Partial load is fine — extract whatever text is available
        console.log(`[layer5] Page load timed out for ${venueUrl} — extracting partial text`);
      }

      // Extract all visible text from the page
      const rawText: string = await page.evaluate(() => document.body.innerText);

      if (!rawText || rawText.trim().length === 0) {
        console.log(`[layer5] No text content found at ${venueUrl}`);
        return null;
      }

      // Build date variants to search for (e.g. "2025-06-14", "Jun 14", "June 14", "6/14")
      const dateVariants = buildDateVariants(date);

      const lines = rawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      // Find lines that contain a date variant
      const dateLineIndices: number[] = [];
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (dateVariants.some((v) => lower.includes(v.toLowerCase()))) {
          dateLineIndices.push(i);
        }
      }

      if (dateLineIndices.length === 0) {
        console.log(`[layer5] No date variants (${dateVariants[0]}...) found in page text`);
        return null;
      }

      // Collect candidate artist lines within a window around each date line
      const WINDOW = 10; // lines before/after date line to scan
      const candidateLines = new Set<string>();

      for (const dateIdx of dateLineIndices) {
        const start = Math.max(0, dateIdx - WINDOW);
        const end = Math.min(lines.length - 1, dateIdx + WINDOW);
        for (let i = start; i <= end; i++) {
          if (i === dateIdx) continue; // skip the date line itself
          const line = lines[i];
          if (isArtistCandidate(line, venueName, dateVariants)) {
            candidateLines.add(line);
          }
        }
      }

      if (candidateLines.size === 0) {
        console.log(`[layer5] No artist candidates found near date lines at ${venueUrl}`);
        return null;
      }

      const artists = Array.from(candidateLines).map((name) => ({
        name,
        performer_id: null,
        platform_url: null,
      }));

      console.log(`[layer5] Found ${artists.length} artist candidates at ${venueUrl}`);

      return {
        confidence: 'medium',
        venue_name: venueName,
        venue_id: null, // caller enriches with DB venue_id if needed
        artists,
        source: 'playwright',
      };
    });
  })();

  // Hard timeout for the entire operation
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => {
      console.log(`[layer5] Operation timed out for ${venueUrl}`);
      resolve(null);
    }, 10_000)
  );

  try {
    return await Promise.race([scrapePromise, timeoutPromise]);
  } catch (err) {
    console.error(`[layer5] Unexpected error for ${venueUrl}:`, err);
    return null;
  }
}

/**
 * Build human-readable date variants for the given YYYY-MM-DD string.
 * E.g. "2025-06-14" → ["2025-06-14", "Jun 14", "June 14", "6/14", "06/14"]
 */
function buildDateVariants(date: string): string[] {
  const [year, monthStr, dayStr] = date.split('-');
  const monthNum = parseInt(monthStr, 10);
  const dayNum = parseInt(dayStr, 10);

  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTH_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const short = MONTH_SHORT[monthNum - 1] ?? '';
  const long  = MONTH_LONG[monthNum - 1]  ?? '';

  return [
    date,                              // 2025-06-14
    `${short} ${dayNum}`,              // Jun 14
    `${long} ${dayNum}`,               // June 14
    `${monthNum}/${dayNum}`,           // 6/14
    `${monthStr}/${dayStr}`,           // 06/14
    `${short} ${dayStr}`,              // Jun 14 (zero-padded)
    `${long} ${dayStr}`,               // June 14 (zero-padded)
  ].filter(Boolean);
}

/**
 * Heuristic: decide if a line looks like an artist/DJ name rather than UI chrome.
 * Rejects: empty, URLs, venue name itself, very long strings, pure numbers, navigation labels.
 */
const NAV_PATTERNS = /^(home|about|contact|tickets?|events?|venue|calendar|bar|menu|drinks?|vip|rsvp|get tickets?|buy now|sold out|doors?|capacity|age|21\+|18\+|\$\d|\d+\.\d+)$/i;

function isArtistCandidate(line: string, venueName: string, dateVariants: string[]): boolean {
  if (line.length < 2 || line.length > 80) return false;
  if (/https?:\/\//.test(line)) return false;
  if (line.toLowerCase().includes(venueName.toLowerCase())) return false;
  if (dateVariants.some((v) => line.toLowerCase().includes(v.toLowerCase()))) return false;
  if (/^\d+$/.test(line)) return false;  // pure number
  if (NAV_PATTERNS.test(line.trim())) return false;
  return true;
}
