-- MIG-07: Add UNIQUE constraint on performers.spotify_id
-- First deduplicate: keep the row with the lowest id for each spotify_id duplicate

-- Remove duplicate rows (keep the one with MIN(id) per spotify_id)
DELETE FROM performers
WHERE spotify_id IS NOT NULL
  AND id NOT IN (
    SELECT MIN(id)
    FROM performers
    WHERE spotify_id IS NOT NULL
    GROUP BY spotify_id
  );

-- Now add the unique constraint
ALTER TABLE performers ADD CONSTRAINT performers_spotify_id_key UNIQUE (spotify_id);
