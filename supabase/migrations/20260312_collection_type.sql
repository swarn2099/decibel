-- MIG-01 + MIG-06: Add collection_type column to collections table and backfill from legacy data
-- collection_type values: 'stamp' (live verified), 'find' (online + founder), 'discovery' (online, not founder)

ALTER TABLE collections ADD COLUMN IF NOT EXISTS collection_type text;

-- Backfill stamps (verified attendance at live show)
UPDATE collections SET collection_type = 'stamp' WHERE verified = true AND collection_type IS NULL;

-- Backfill discoveries (online discovery, NOT a founder)
UPDATE collections c SET collection_type = 'discovery'
  WHERE c.capture_method = 'online' AND c.collection_type IS NULL
  AND NOT EXISTS (SELECT 1 FROM founder_badges fb WHERE fb.fan_id = c.fan_id AND fb.performer_id = c.performer_id);

-- Remaining online = finds (has founder badge)
UPDATE collections c SET collection_type = 'find' WHERE c.capture_method = 'online' AND c.collection_type IS NULL;

-- Default for new entries
ALTER TABLE collections ALTER COLUMN collection_type SET DEFAULT 'stamp';
