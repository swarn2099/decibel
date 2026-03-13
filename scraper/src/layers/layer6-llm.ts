import Anthropic from '@anthropic-ai/sdk';
import type { ScrapeResult } from '../types';

/**
 * Layer 6 — Claude Haiku web search for venue lineup.
 * Last-resort layer. ALWAYS returns confidence: 'low' — LLM results require
 * user confirmation (link paste) before creating a stamp.
 *
 * Returns null on any error.
 */
export async function queryLLMForLineup(
  venueName: string,
  city: string,
  date: string // YYYY-MM-DD
): Promise<ScrapeResult | null> {
  const llmPromise = (async (): Promise<ScrapeResult | null> => {
    try {
      const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });

      const humanDate = formatDateForHumans(date);
      const prompt = `What artists or DJs are performing at "${venueName}" in ${city} on ${humanDate}? Return ONLY a JSON array of artist name strings. If you cannot find specific artists, return [].`;

      console.log(`[layer6] Querying Claude Haiku for "${venueName}" in ${city} on ${date}`);

      const response = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        tools: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { type: 'web_search_20250305', name: 'web_search' } as any,
        ],
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract the final text block from the response
      let artistNames: string[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          const parsed = tryParseArtistArray(block.text);
          if (parsed !== null) {
            artistNames = parsed;
            break;
          }
        }
      }

      if (artistNames.length === 0) {
        console.log(`[layer6] No artists found for "${venueName}" on ${date}`);
        return null;
      }

      console.log(`[layer6] Found ${artistNames.length} artists via LLM for "${venueName}"`);

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
      console.error('[layer6] Error querying Claude:', err);
      return null;
    }
  })();

  // Hard timeout for the LLM call
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => {
      console.log(`[layer6] LLM query timed out for "${venueName}"`);
      resolve(null);
    }, 15_000)
  );

  return Promise.race([llmPromise, timeoutPromise]);
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
