import { execFile } from 'child_process';
import type { ScrapeResult } from '../types';

/**
 * Layer 6 — Claude Code CLI web search for venue lineup.
 * Last-resort layer. ALWAYS returns confidence: 'low' — LLM results require
 * user confirmation (link paste) before creating a stamp.
 *
 * Uses the claude CLI already installed on the VM instead of a separate API key.
 * Returns null on any error.
 */
export async function queryLLMForLineup(
  venueName: string,
  city: string,
  date: string // YYYY-MM-DD
): Promise<ScrapeResult | null> {
  const llmPromise = (async (): Promise<ScrapeResult | null> => {
    try {
      const humanDate = formatDateForHumans(date);
      const prompt = `What artists or DJs are performing at "${venueName}" in ${city} on ${humanDate}? Return ONLY a JSON array of artist name strings. If you cannot find specific artists, return [].`;

      console.log(`[layer6] Querying Claude CLI for "${venueName}" in ${city} on ${date}`);

      const stdout = await runClaude(prompt);
      const artistNames = tryParseArtistArray(stdout);

      if (!artistNames || artistNames.length === 0) {
        console.log(`[layer6] No artists found for "${venueName}" on ${date}`);
        return null;
      }

      console.log(`[layer6] Found ${artistNames.length} artists via CLI for "${venueName}"`);

      return {
        confidence: 'low', // ALWAYS low — LLM results require user confirmation
        venue_name: venueName,
        venue_id: null,
        artists: artistNames.map((name) => ({
          name,
          performer_id: null,
          platform_url: null,
        })),
        source: 'llm',
      };
    } catch (err) {
      console.error('[layer6] Error querying Claude CLI:', err);
      return null;
    }
  })();

  // Hard timeout for the CLI call
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => {
      console.log(`[layer6] CLI query timed out for "${venueName}"`);
      resolve(null);
    }, 20_000)
  );

  return Promise.race([llmPromise, timeoutPromise]);
}

/**
 * Shell out to `claude` CLI with -p flag for a single prompt.
 */
function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'claude',
      ['-p', prompt, '--no-input'],
      { timeout: 18_000, maxBuffer: 1024 * 256 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`claude CLI error: ${err.message}${stderr ? ` — ${stderr}` : ''}`));
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

/**
 * Attempt to extract a JSON array of strings from an LLM text response.
 * Handles: bare arrays, markdown code blocks, arrays embedded in prose.
 */
function tryParseArtistArray(text: string): string[] | null {
  // Strip markdown code fences
  const stripped = text
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();

  // Find first [ ... ] in the text
  const match = stripped.match(/\[[\s\S]*?\]/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return (parsed as string[]).filter((s) => s.trim().length > 0);
    }
  } catch {
    // Not valid JSON
  }

  return null;
}

/**
 * Format YYYY-MM-DD as "June 14, 2025" for the LLM prompt.
 */
function formatDateForHumans(date: string): string {
  const [year, monthStr, dayStr] = date.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const month = months[parseInt(monthStr, 10) - 1] ?? monthStr;
  const day = parseInt(dayStr, 10);
  return `${month} ${day}, ${year}`;
}
