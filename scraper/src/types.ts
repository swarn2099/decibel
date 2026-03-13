export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ScrapedArtist {
  name: string;
  performer_id: string | null;
  platform_url: string | null;
}

export interface ScrapeRequest {
  searchId: string;
  userId: string;
  lat: number;
  lng: number;
  localDate: string;   // YYYY-MM-DD
  venueName?: string;  // hint from client
}

export interface ScrapeResult {
  confidence: ConfidenceLevel;
  venue_name: string | null;
  venue_id: string | null;
  artists: ScrapedArtist[];
  source: string;
}
