/**
 * Apply RLS policies to Supabase database via direct PostgreSQL connection.
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD=<your-password> npx tsx scripts/apply-rls.ts
 *
 * Or via Supabase CLI:
 *   npx supabase login
 *   npx supabase link --project-ref savcbkbgoadjxkjnteqv
 *   npx supabase db push
 */
import pg from "pg";
import * as dotenv from "dotenv";
import * as dns from "dns";
import { resolve } from "path";
import * as fs from "fs";

// Force IPv4 for DNS resolution
dns.setDefaultResultOrder("ipv4first");

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}

if (!dbPassword) {
  console.error("Missing SUPABASE_DB_PASSWORD environment variable.");
  console.error("Set it in .env.local or pass inline:");
  console.error("  SUPABASE_DB_PASSWORD=<your-password> npx tsx scripts/apply-rls.ts");
  console.error("\nAlternatively, use Supabase CLI:");
  console.error("  npx supabase login && npx supabase link --project-ref savcbkbgoadjxkjnteqv && npx supabase db push");
  process.exit(1);
}

const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");

// Use session mode pooler (port 5432) for DDL support
const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

async function applyRLS() {
  const sqlPath = resolve(__dirname, "rls-policies.sql");
  const fullSql = fs.readFileSync(sqlPath, "utf-8");

  console.log("Connecting to Supabase PostgreSQL via pooler...");

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected! Applying RLS policies...\n");

    await client.query(fullSql);
    console.log("All RLS policies applied successfully!\n");

    // Verify
    const result = await client.query(`
      SELECT tablename, policyname, permissive, roles, cmd
      FROM pg_policies
      WHERE tablename IN ('collections', 'fan_tiers', 'messages')
      ORDER BY tablename, policyname;
    `);

    console.log("Active policies on target tables:");
    for (const row of result.rows) {
      console.log(`  ${row.tablename}: ${row.policyname} (${row.cmd}, ${row.permissive})`);
    }
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyRLS().catch(console.error);
