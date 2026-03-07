export interface PassportFan {
  id: string;
  email: string;
  name: string | null;
  city: string | null;
  created_at: string; // "member since" date
}

export interface PassportTimelineEntry {
  id: string; // collection id
  performer: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
    genres: string[];
    city: string;
  };
  venue: { name: string } | null;
  event_date: string | null;
  capture_method: "qr" | "nfc" | "location" | "online";
  verified: boolean; // true = in-person, false = discovered
  created_at: string;
  // Tier info (only for verified collections)
  scan_count: number | null;
  current_tier: string | null;
}

export interface PassportStats {
  totalArtists: number; // unique performers collected (verified)
  totalDiscovered: number; // unique performers discovered (online)
  totalShows: number; // total verified collection entries
  uniqueVenues: number;
  uniqueCities: number;
  favoriteGenre: string | null; // most common genre across collections
  mostCollectedArtist: { name: string; count: number } | null;
  mostVisitedVenue: { name: string; count: number } | null;
  currentStreak: number; // consecutive weeks with a verified scan
  memberSince: string;
}

export type CaptureMethodIcon = "qr" | "nfc" | "location" | "online";
