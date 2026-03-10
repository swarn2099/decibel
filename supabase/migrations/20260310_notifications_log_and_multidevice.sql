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

-- 2. Multi-device push token support
-- Remove the single-user-id unique constraint, add composite (user_id, expo_push_token)
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_key;

ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_user_token_unique
  UNIQUE (user_id, expo_push_token);
