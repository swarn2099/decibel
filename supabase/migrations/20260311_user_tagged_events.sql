-- Migration: create user_tagged_events table
-- Phase 03-check-in: stores crowdsourced performer tags at venues

CREATE TABLE IF NOT EXISTS user_tagged_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id       uuid NOT NULL REFERENCES fans(id) ON DELETE CASCADE,
  venue_id     uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  performer_id uuid NOT NULL REFERENCES performers(id) ON DELETE CASCADE,
  event_date   date NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_tagged_events_venue_date_idx
  ON user_tagged_events(venue_id, event_date);

CREATE UNIQUE INDEX IF NOT EXISTS user_tagged_events_unique_idx
  ON user_tagged_events(fan_id, venue_id, performer_id, event_date);
