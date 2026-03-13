-- MIG-02: search_results table with Realtime publication + RLS SELECT policy
CREATE TABLE IF NOT EXISTS search_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id    uuid NOT NULL,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confidence   text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  venue_name   text,
  venue_id     uuid REFERENCES venues(id),
  artists      jsonb NOT NULL DEFAULT '[]',
  source       text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_results_search_id_idx ON search_results(search_id);
CREATE INDEX IF NOT EXISTS search_results_user_id_idx ON search_results(user_id);

ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own search results"
  ON search_results FOR SELECT
  USING (auth.uid() = user_id);

-- Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE search_results;

-- MIG-03: venue_submissions for crowdsource fallback pattern detection
CREATE TABLE IF NOT EXISTS venue_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id          uuid NOT NULL REFERENCES fans(id) ON DELETE CASCADE,
  venue_name      text NOT NULL,
  venue_id        uuid REFERENCES venues(id),
  lat             double precision,
  lng             double precision,
  performer_name  text,
  platform_url    text,
  event_date      date NOT NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venue_submissions_venue_date_idx
  ON venue_submissions(venue_id, event_date);

ALTER TABLE venue_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fans can insert own submissions"
  ON venue_submissions FOR INSERT
  WITH CHECK (
    fan_id IN (SELECT id FROM fans WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );
