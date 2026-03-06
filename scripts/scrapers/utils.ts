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
  const words = lower.split(/\s+/);

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
    // New patterns
    /\btakeover\b/i,
    /\bresidency\b/i,
    /\bopen to close\b/i,
    /\ball night long\b/i,
    /\bfree entry\b/i,
    /\bno cover\b/i,
    /\bdoors at\b/i,
    /\b(21|18)\+/i,
    /\$\d+/i, // ticket price patterns like "$XX"
  ];

  for (const pattern of eventPatterns) {
    if (pattern.test(name)) return true;
  }

  // "rave" as standalone word at end (but NOT as part of a DJ name)
  if (/\brave\b$/i.test(name.trim())) return true;

  // "night" at end when preceded by adjective/descriptor
  if (/\b\w+\s+night\b$/i.test(name.trim()) && words.length >= 2) return true;

  // "b2b" as the entire name (not as part of "Artist1 b2b Artist2")
  if (lower === "b2b") return true;

  // Names with 8+ words are almost certainly event titles
  if (words.length >= 8) return true;

  // ALL CAPS names with 4+ words are likely event titles
  if (name === name.toUpperCase() && words.length >= 4) return true;

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

/**
 * Normalizes an Instagram handle from various formats to a plain username.
 * Handles full URLs, @-prefixed handles, and plain usernames.
 * Returns lowercase trimmed username, or empty string if input is empty/null.
 */
export function normalizeInstagramHandle(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "";

  let handle = raw.trim();

  // If it contains "instagram.com/", extract the path segment
  if (handle.includes("instagram.com/")) {
    try {
      // Ensure it has a protocol for URL parsing
      const urlStr = handle.startsWith("http") ? handle : `https://${handle}`;
      const url = new URL(urlStr);
      // Get the first non-empty path segment
      const segments = url.pathname.split("/").filter(Boolean);
      handle = segments[0] || "";
    } catch {
      // Fallback: regex extraction
      const match = handle.match(/instagram\.com\/([^/?&#]+)/);
      handle = match?.[1] || "";
    }
  }

  // Strip leading "@"
  handle = handle.replace(/^@/, "");

  // Strip query params or trailing slashes that might remain
  handle = handle.split("?")[0].split("#")[0].replace(/\/+$/, "");

  return handle.toLowerCase().trim();
}
