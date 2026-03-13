export type { ConfidenceLevel, ScrapeResult, ScrapedArtist } from './types';

const CONFIDENCE_RANK: Record<string, number> = {
  high: 2,
  medium: 1,
  low: 0,
};

/**
 * Merge multiple ScrapeResults into a single best result.
 * Picks the highest-confidence result. If tied, prefers the one with more artists.
 */
export function mergeResults(results: import('./types').ScrapeResult[]): import('./types').ScrapeResult {
  if (results.length === 0) {
    return {
      confidence: 'low',
      venue_name: null,
      venue_id: null,
      artists: [],
      source: 'none',
    };
  }

  return results.reduce((best, current) => {
    const bestRank = CONFIDENCE_RANK[best.confidence] ?? 0;
    const currentRank = CONFIDENCE_RANK[current.confidence] ?? 0;

    if (currentRank > bestRank) return current;
    if (currentRank === bestRank && current.artists.length > best.artists.length) return current;
    return best;
  });
}
