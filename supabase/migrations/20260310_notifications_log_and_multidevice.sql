-- Notifications log table + multi-device push token support
-- Adds: notifications_log (rate limiting + history), composite unique on push_tokens

-- 1. notifications_log table (tracks sent notifications for rate limiting + history)
CREATE TABLE IF NOT EXISTS notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  sent_at timestamptz DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_log_user_sent
  ON notifications_log(user_id, sent_at);

ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications_log FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Push tokens table (create if not exists, then apply multi-device support)
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expo_push_token text NOT NULL,
  platform text DEFAULT 'ios',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Remove old single-user unique constraint if it exists, add composite for multi-device
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_key;

ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_user_token_unique
  UNIQUE (user_id, expo_push_token);

-- 3. Notification preferences table (per-type toggles)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
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

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);
