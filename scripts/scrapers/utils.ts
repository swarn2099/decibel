import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE env vars. Check .env.local");
  }

  return createClient(url, key);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Simple fuzzy name matching — normalized comparison
export function namesMatch(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalize(a) === normalize(b);
}

export function log(source: string, msg: string) {
  console.log(`[${source}] ${msg}`);
}

export function logError(source: string, msg: string, err?: unknown) {
  console.error(`[${source}] ERROR: ${msg}`, err instanceof Error ? err.message : "");
}
