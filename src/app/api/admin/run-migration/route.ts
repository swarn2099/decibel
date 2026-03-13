import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Client as PgClient } from "pg";
import * as dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_SECRET = process.env.ADMIN_MIGRATION_SECRET ?? "decibel-migrate-2026";

async function runWithPg(statements: string[]): Promise<{ ok: boolean; error?: string }[]> {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .replace("https://", "")
    .replace(".supabase.co", "");

  if (!dbPassword || !projectRef) {
    return statements.map((s) => ({ ok: false, error: "SUPABASE_DB_PASSWORD not set" }));
  }

  const client = new PgClient({
    host: `aws-0-us-east-1.pooler.supabase.com`,
    port: 6543,
    database: "postgres",
    user: `postgres.${projectRef}`,
    password: dbPassword,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const results: { ok: boolean; error?: string }[] = [];
    for (const sql of statements) {
      try {
        await client.query(sql);
        results.push({ ok: true });
      } catch (e) {
        results.push({ ok: false, error: String(e) });
      }
    }
    await client.end();
    return results;
  } catch (e) {
    return statements.map(() => ({ ok: false, error: `Connection failed: ${String(e)}` }));
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { migration } = await req.json();

  const results: Record<string, unknown> = {};

  try {
    if (migration === "all" || migration === "collection_type") {
      // MIG-01 + MIG-06: Add collection_type column
      const steps = [
        "ALTER TABLE collections ADD COLUMN IF NOT EXISTS collection_type text",
        "UPDATE collections SET collection_type = 'stamp' WHERE verified = true AND collection_type IS NULL",
        `UPDATE collections c SET collection_type = 'discovery'
          WHERE c.capture_method = 'online' AND c.collection_type IS NULL
          AND NOT EXISTS (SELECT 1 FROM founder_badges fb WHERE fb.fan_id = c.fan_id AND fb.performer_id = c.performer_id)`,
        "UPDATE collections c SET collection_type = 'find' WHERE c.capture_method = 'online' AND c.collection_type IS NULL",
        "ALTER TABLE collections ALTER COLUMN collection_type SET DEFAULT 'stamp'",
      ];

      const stepResults = await runWithPg(steps);
      results.collection_type = stepResults;
    }

    if (migration === "all" || migration === "event_artists") {
      // MIG-04: Create event_artists junction table
      const steps = [
        `CREATE TABLE IF NOT EXISTS event_artists (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          performer_id UUID NOT NULL REFERENCES performers(id) ON DELETE CASCADE,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(event_id, performer_id)
        )`,
        "CREATE INDEX IF NOT EXISTS event_artists_event_id_idx ON event_artists(event_id)",
        "CREATE INDEX IF NOT EXISTS event_artists_performer_id_idx ON event_artists(performer_id)",
      ];

      const stepResults = await runWithPg(steps);
      results.event_artists = stepResults;
    }

    if (migration === "all" || migration === "search_results") {
      // MIG-02: search_results table with Realtime + RLS (Phase 9)
      const steps = [
        `CREATE TABLE IF NOT EXISTS search_results (
          id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          search_id    uuid NOT NULL,
          user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          confidence   text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
          venue_name   text,
          venue_id     uuid REFERENCES venues(id),
          artists      jsonb NOT NULL DEFAULT '[]',
          source       text NOT NULL,
          created_at   timestamptz DEFAULT now()
        )`,
        "CREATE INDEX IF NOT EXISTS search_results_search_id_idx ON search_results(search_id)",
        "CREATE INDEX IF NOT EXISTS search_results_user_id_idx ON search_results(user_id)",
        "ALTER TABLE search_results ENABLE ROW LEVEL SECURITY",
        `CREATE POLICY IF NOT EXISTS "Users can read own search results" ON search_results FOR SELECT USING (auth.uid() = user_id)`,
        "ALTER PUBLICATION supabase_realtime ADD TABLE search_results",
      ];

      const stepResults = await runWithPg(steps);
      results.search_results = stepResults;
    }

    if (migration === "all" || migration === "venue_submissions") {
      // MIG-03: venue_submissions table for crowdsource fallback (Phase 9)
      const steps = [
        `CREATE TABLE IF NOT EXISTS venue_submissions (
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
        )`,
        "CREATE INDEX IF NOT EXISTS venue_submissions_venue_date_idx ON venue_submissions(venue_id, event_date)",
        "ALTER TABLE venue_submissions ENABLE ROW LEVEL SECURITY",
        `CREATE POLICY IF NOT EXISTS "Fans can insert own submissions" ON venue_submissions FOR INSERT WITH CHECK (fan_id IN (SELECT id FROM fans WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())))`,
      ];

      const stepResults = await runWithPg(steps);
      results.venue_submissions = stepResults;
    }
  } catch (e) {
    results.error = String(e);
  }

  return NextResponse.json(results);
}
