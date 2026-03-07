/**
 * Badge Evaluation Engine
 *
 * The fan_badges table must exist in Supabase before using checkNewBadges.
 * Run this SQL in the Supabase SQL Editor:
 *
 * ```sql
 * CREATE TABLE IF NOT EXISTS fan_badges (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   fan_id uuid REFERENCES fans(id) ON DELETE CASCADE,
 *   badge_id text NOT NULL,
 *   earned_at timestamptz DEFAULT now(),
 *   UNIQUE(fan_id, badge_id)
 * );
 * CREATE INDEX IF NOT EXISTS idx_fan_badges_fan_id ON fan_badges(fan_id);
 * ```
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BadgeId } from "@/lib/types/badges";
import { BADGE_DEFINITIONS } from "@/lib/badges/definitions";

// ─── Data shape for pure evaluation ──────────────────────────────

export interface FanBadgeData {
  fanId: string;
  fanCreatedAt: string;
  totalVerified: number;
  totalDiscovered: number;
  totalCollections: number;
  uniqueGenres: number;
  uniqueCities: number;
  uniqueVenues: number;
  maxVenueVisits: number;
  currentStreak: number;
  hasInnerCircle: boolean;
  fanRank: number | null; // position among all fans by created_at
}

// ─── Pure evaluation (no DB) ─────────────────────────────────────

/** Pure function: evaluate which badges a fan qualifies for based on data. */
export function evaluateBadges(data: FanBadgeData): BadgeId[] {
  const earned: BadgeId[] = [];

  // Discovery
  if (data.totalDiscovered >= 10) earned.push("trailblazer");
  if (data.fanRank !== null && data.fanRank <= 100) earned.push("first-100");
  if (data.totalVerified >= 10) earned.push("first-10-verified");

  // Attendance
  if (data.totalVerified >= 5) earned.push("regular");
  if (data.totalVerified >= 20) earned.push("devotee");
  if (data.hasInnerCircle) earned.push("inner-circle-badge");
  if (data.maxVenueVisits >= 5) earned.push("venue-local");
  if (data.maxVenueVisits >= 20) earned.push("venue-legend");

  // Exploration
  if (data.uniqueGenres >= 5) earned.push("genre-explorer");
  if (data.uniqueCities >= 3) earned.push("city-hopper");
  if (data.uniqueVenues >= 3) earned.push("night-owl");
  const monthsAsMember = monthsSince(data.fanCreatedAt);
  if (monthsAsMember >= 6) earned.push("scene-veteran");
  if (data.totalCollections >= 100) earned.push("centurion");

  // Streak
  if (data.currentStreak >= 3) earned.push("on-fire");
  if (data.currentStreak >= 8) earned.push("unstoppable");
  if (data.currentStreak >= 26) earned.push("year-round");

  // Social
  if (data.totalDiscovered >= 25) earned.push("tastemaker");
  if (data.totalCollections >= 10) earned.push("connector");

  return earned;
}

// ─── DB helpers ──────────────────────────────────────────────────

/** Build the FanBadgeData object by querying Supabase. */
export async function buildFanBadgeData(
  fanId: string,
  admin: SupabaseClient
): Promise<FanBadgeData> {
  // Fan record
  const { data: fan } = await admin
    .from("fans")
    .select("id, created_at")
    .eq("id", fanId)
    .single();

  if (!fan) throw new Error(`Fan ${fanId} not found`);

  // Collections with performer genres and venue info
  const { data: collections } = await admin
    .from("collections")
    .select("performer_id, venue_id, capture_method, verified, performers(genres, city)")
    .eq("fan_id", fanId);

  const cols = collections ?? [];
  const verified = cols.filter((c) => c.verified);
  const discovered = cols.filter((c) => !c.verified);

  // Unique genres from collected performers
  const genreSet = new Set<string>();
  for (const c of cols) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = c.performers as any;
    const genres: string[] = p?.genres ?? [];
    for (const g of genres) genreSet.add(g.toLowerCase());
  }

  // Unique cities from collected performers
  const citySet = new Set<string>();
  for (const c of cols) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = c.performers as any;
    if (p?.city) citySet.add(p.city.toLowerCase());
  }

  // Unique venues & max venue visits
  const venueCounts: Record<string, number> = {};
  for (const c of verified) {
    if (c.venue_id) {
      venueCounts[c.venue_id] = (venueCounts[c.venue_id] || 0) + 1;
    }
  }
  const uniqueVenues = Object.keys(venueCounts).length;
  const maxVenueVisits = Math.max(0, ...Object.values(venueCounts));

  // Inner Circle check
  const { data: innerCircleRows } = await admin
    .from("fan_tiers")
    .select("id")
    .eq("fan_id", fanId)
    .eq("current_tier", "inner_circle")
    .limit(1);

  const hasInnerCircle = (innerCircleRows ?? []).length > 0;

  // Fan rank (position by created_at)
  const { count: rankCount } = await admin
    .from("fans")
    .select("id", { count: "exact", head: true })
    .lte("created_at", fan.created_at);

  // Current streak — count consecutive weeks with a verified collection
  // going backwards from this week
  const currentStreak = await computeStreak(fanId, admin);

  return {
    fanId,
    fanCreatedAt: fan.created_at,
    totalVerified: verified.length,
    totalDiscovered: discovered.length,
    totalCollections: cols.length,
    uniqueGenres: genreSet.size,
    uniqueCities: citySet.size,
    uniqueVenues,
    maxVenueVisits,
    currentStreak,
    hasInnerCircle,
    fanRank: rankCount ?? null,
  };
}

/**
 * Check for new badges, insert any newly earned ones, return the new badge IDs.
 */
export async function checkNewBadges(
  fanId: string,
  admin: SupabaseClient
): Promise<BadgeId[]> {
  const data = await buildFanBadgeData(fanId, admin);
  const allEarned = evaluateBadges(data);

  // Get already-earned badges
  const { data: existing } = await admin
    .from("fan_badges")
    .select("badge_id")
    .eq("fan_id", fanId);

  const existingIds = new Set((existing ?? []).map((r) => r.badge_id));
  const newBadges = allEarned.filter((id) => !existingIds.has(id));

  if (newBadges.length > 0) {
    const rows = newBadges.map((badge_id) => ({
      fan_id: fanId,
      badge_id,
    }));
    await admin.from("fan_badges").upsert(rows, {
      onConflict: "fan_id,badge_id",
    });
  }

  return newBadges;
}

// ─── Helpers ─────────────────────────────────────────────────────

function monthsSince(dateStr: string): number {
  const then = new Date(dateStr);
  const now = new Date();
  return (
    (now.getFullYear() - then.getFullYear()) * 12 +
    (now.getMonth() - then.getMonth())
  );
}

/**
 * Compute consecutive weeks with at least one verified collection,
 * going backwards from the current week.
 */
async function computeStreak(
  fanId: string,
  admin: SupabaseClient
): Promise<number> {
  const { data: verifiedDates } = await admin
    .from("collections")
    .select("created_at")
    .eq("fan_id", fanId)
    .eq("verified", true)
    .order("created_at", { ascending: false });

  if (!verifiedDates || verifiedDates.length === 0) return 0;

  // Group by ISO week
  const weekSet = new Set<string>();
  for (const row of verifiedDates) {
    weekSet.add(getISOWeekKey(new Date(row.created_at)));
  }

  // Walk backwards from current week
  const now = new Date();
  let streak = 0;
  let cursor = new Date(now);

  while (true) {
    const key = getISOWeekKey(cursor);
    if (weekSet.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    } else {
      break;
    }
  }

  return streak;
}

function getISOWeekKey(date: Date): string {
  // Get Monday of the week
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
