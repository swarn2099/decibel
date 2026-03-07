/**
 * Backfill badges for all existing fans.
 *
 * Usage:
 *   npx tsx scripts/backfill-badges.ts
 *
 * PREREQUISITE: The fan_badges table must exist. Run this SQL in Supabase SQL Editor first:
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

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Inline badge evaluation (avoid path alias issues in scripts) ──

interface FanBadgeData {
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
  fanRank: number | null;
}

function evaluateBadges(data: FanBadgeData): string[] {
  const earned: string[] = [];

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

function monthsSince(dateStr: string): number {
  const then = new Date(dateStr);
  const now = new Date();
  return (
    (now.getFullYear() - then.getFullYear()) * 12 +
    (now.getMonth() - then.getMonth())
  );
}

function getISOWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// ─── Main ────────────────────────────────────────────────────────

async function backfill() {
  console.log("Starting badge backfill...\n");

  // Fetch all fans
  const { data: fans, error: fansErr } = await admin
    .from("fans")
    .select("id, created_at")
    .order("created_at", { ascending: true });

  if (fansErr || !fans) {
    console.error("Failed to fetch fans:", fansErr?.message);
    process.exit(1);
  }

  console.log(`Found ${fans.length} fans to process.\n`);
  let totalBadgesAwarded = 0;

  for (let i = 0; i < fans.length; i++) {
    const fan = fans[i];
    const fanRank = i + 1; // 1-indexed position by created_at

    try {
      // Fetch collections
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: collections } = await admin
        .from("collections")
        .select(
          "performer_id, venue_id, capture_method, verified, created_at, performers(genres, city)"
        )
        .eq("fan_id", fan.id);

      const cols = collections ?? [];
      const verified = cols.filter((c) => c.verified);
      const discovered = cols.filter((c) => !c.verified);

      // Unique genres
      const genreSet = new Set<string>();
      for (const c of cols) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = c.performers as any;
        const genres: string[] = p?.genres ?? [];
        for (const g of genres) genreSet.add(g.toLowerCase());
      }

      // Unique cities
      const citySet = new Set<string>();
      for (const c of cols) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = c.performers as any;
        if (p?.city) citySet.add(p.city.toLowerCase());
      }

      // Venue counts
      const venueCounts: Record<string, number> = {};
      for (const c of verified) {
        if (c.venue_id) {
          venueCounts[c.venue_id] = (venueCounts[c.venue_id] || 0) + 1;
        }
      }
      const uniqueVenues = Object.keys(venueCounts).length;
      const maxVenueVisits = Math.max(0, ...Object.values(venueCounts));

      // Inner Circle check
      const { data: icRows } = await admin
        .from("fan_tiers")
        .select("id")
        .eq("fan_id", fan.id)
        .eq("current_tier", "inner_circle")
        .limit(1);

      // Streak
      const weekSet = new Set<string>();
      for (const c of verified) {
        weekSet.add(getISOWeekKey(new Date(c.created_at)));
      }
      let streak = 0;
      const cursor = new Date();
      while (true) {
        const key = getISOWeekKey(cursor);
        if (weekSet.has(key)) {
          streak++;
          cursor.setDate(cursor.getDate() - 7);
        } else {
          break;
        }
      }

      const badgeData: FanBadgeData = {
        fanId: fan.id,
        fanCreatedAt: fan.created_at,
        totalVerified: verified.length,
        totalDiscovered: discovered.length,
        totalCollections: cols.length,
        uniqueGenres: genreSet.size,
        uniqueCities: citySet.size,
        uniqueVenues,
        maxVenueVisits,
        currentStreak: streak,
        hasInnerCircle: (icRows ?? []).length > 0,
        fanRank,
      };

      const earned = evaluateBadges(badgeData);

      if (earned.length > 0) {
        const rows = earned.map((badge_id) => ({
          fan_id: fan.id,
          badge_id,
        }));

        const { error: upsertErr } = await admin
          .from("fan_badges")
          .upsert(rows, { onConflict: "fan_id,badge_id" });

        if (upsertErr) {
          console.error(
            `  Fan ${i + 1} (${fan.id}): upsert error — ${upsertErr.message}`
          );
        } else {
          totalBadgesAwarded += earned.length;
          console.log(
            `  Fan ${i + 1}: earned ${earned.length} badges (${earned.join(", ")})`
          );
        }
      } else {
        console.log(`  Fan ${i + 1}: no badges earned`);
      }
    } catch (err) {
      console.error(`  Fan ${i + 1} (${fan.id}): error — ${err}`);
    }
  }

  console.log(
    `\nBackfill complete. ${totalBadgesAwarded} total badges awarded to ${fans.length} fans.`
  );
}

backfill().catch(console.error);
