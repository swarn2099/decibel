import { createClient } from '@supabase/supabase-js';
import type { ScrapeResult } from './types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Writes a ScrapeResult to the search_results table.
 * The INSERT triggers Supabase Realtime which notifies the mobile client.
 */
export async function writeSearchResult(
  searchId: string,
  userId: string,
  result: ScrapeResult
): Promise<void> {
  const { error } = await supabase.from('search_results').insert({
    search_id: searchId,
    user_id: userId,
    confidence: result.confidence,
    venue_name: result.venue_name,
    venue_id: result.venue_id,
    artists: result.artists,
    source: result.source,
  });

  if (error) {
    console.error('[write-result] Failed to write search result:', error.message);
    throw new Error(`writeSearchResult failed: ${error.message}`);
  }

  console.log(`[write-result] Written result for searchId=${searchId} confidence=${result.confidence} artists=${result.artists.length}`);
}
