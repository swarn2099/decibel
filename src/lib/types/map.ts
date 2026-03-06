export interface MapEvent {
  id: string;
  event_date: string;
  start_time: string | null;
  external_url: string | null;
  performer_name: string;
  performer_slug: string;
  performer_photo: string | null;
}

export interface MapVenue {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  event_count: number;
  genres: string[];
  upcoming_events: MapEvent[];
}
