import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_SECRET = process.env.ADMIN_MIGRATION_SECRET ?? "decibel-migrate-2026";

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

      const stepResults: unknown[] = [];
      for (const sql of steps) {
        const { error } = await admin.rpc("exec_raw_sql", { sql }) as { error: unknown };
        if (error) {
          // Try direct query via REST fallback
          stepResults.push({ sql: sql.slice(0, 60), error });
        } else {
          stepResults.push({ sql: sql.slice(0, 60), ok: true });
        }
      }
      results.collection_type = stepResults;
    }
  } catch (e) {
    results.error = String(e);
  }

  return NextResponse.json(results);
}
