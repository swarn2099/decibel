-- MIG-05: Add embed URL columns to performers table for audio preview support
ALTER TABLE performers
  ADD COLUMN IF NOT EXISTS spotify_embed_url text,
  ADD COLUMN IF NOT EXISTS soundcloud_embed_url text,
  ADD COLUMN IF NOT EXISTS apple_music_embed_url text,
  ADD COLUMN IF NOT EXISTS top_track_cached_at timestamptz;
