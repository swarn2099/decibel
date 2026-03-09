-- Push Notifications: Token storage + notification preferences
-- Run this SQL in the Supabase SQL Editor for project savcbkbgoadjxkjnteqv

-- 1. Push tokens table (one token per user)
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  expo_push_token text NOT NULL,
  platform text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- 2. Notification preferences table (one row per user)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nearby_events boolean DEFAULT true,
  badge_unlocks boolean DEFAULT true,
  tier_ups boolean DEFAULT true,
  artist_messages boolean DEFAULT true,
  friend_joins boolean DEFAULT true,
  weekly_recap boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);
