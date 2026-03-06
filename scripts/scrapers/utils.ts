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

/**
 * Validates whether a scraped name looks like a real artist/DJ
 * vs an event name, party brand, or other non-artist entry.
 * Returns true if the name should be REJECTED.
 */
export function isNonArtistName(name: string): boolean {
  const lower = name.toLowerCase().trim();

  // Event/party keywords (but not as part of a DJ name like "Party Favor")
  const eventPatterns = [
    /\bparty\b.*\b(day|night|rocking|hop)\b/i,
    /\b(biggest|ultimate|official)\b/i,
    /\bfestival\b/i,
    /\bpresents\b/i,
    /\bhosted by\b/i,
    /\bfeaturing\b/i,
    /\bpop-up\b/i,
    /\bshowcase\b$/i,
    /\bexperience\b$/i,
    /\btour\b$/i,
    /\bvs\.\s/i,
    /\bvs\s/i,
  ];

  for (const pattern of eventPatterns) {
    if (pattern.test(name)) return true;
  }

  // Names that are too long (15+ words = probably an event title)
  if (lower.split(/\s+/).length >= 15) return true;

  // Contains a year (e.g., "2000's Party")
  if (/\b(19|20)\d{2}('s)?\b/.test(name) && name.length > 20) return true;

  // Contains city/venue as primary identifier
  if (/^(chicago|rosemont|evanston)\b/i.test(name) && name.length > 15) return true;

  // Looks like a themed event: "[Noun] Rave" where noun isn't a DJ name
  if (/^(shrek|broadway|disney|mario|anime|pokemon|90s|80s|70s)\s+(rave|party)/i.test(lower)) return true;

  // Contains dash-separated event description
  if (name.includes(" - ") && name.length > 40) return true;

  return false;
}
