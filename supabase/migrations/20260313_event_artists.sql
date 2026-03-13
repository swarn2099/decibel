-- MIG-04: Create event_artists junction table for linking events to performers
-- Used by the Jukebox feature to associate performers with events

CREATE TABLE IF NOT EXISTS event_artists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  performer_id UUID NOT NULL REFERENCES performers(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, performer_id)
);

-- Index for fast lookups by event
CREATE INDEX IF NOT EXISTS event_artists_event_id_idx ON event_artists(event_id);

-- Index for fast lookups by performer
CREATE INDEX IF NOT EXISTS event_artists_performer_id_idx ON event_artists(performer_id);
