import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { LeaderboardClient } from "./leaderboard-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard | DECIBEL",
  description: "Top fans and performers in the Chicago underground scene",
};

export type FanEntry = {
  rank: number;
  fanId: string;
  name: string;
  count: number;
  topTier: string;
};

export type PerformerEntry = {
  rank: number;
  performerId: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  fanCount: number;
};

export type LeaderboardData = {
  fans: FanEntry[];
  performers: PerformerEntry[];
};

function getTierFromCount(count: number): string {
  if (count >= 10) return "inner_circle";
  if (count >= 5) return "secret";
  if (count >= 3) return "early_access";
  return "network";
}

async function fetchFanLeaderboard(
  admin: ReturnType<typeof createSupabaseAdmin>,
  since?: Date
): Promise<FanEntry[]> {
  let query = admin
    .from("collections")
    .select("fan_id, performer_id, created_at");

  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data: collections } = await query;
  if (!collections || collections.length === 0) return [];

  // Group by fan_id, count distinct performer_ids
  const fanCounts = new Map<string, Set<string>>();
  for (const c of collections) {
    if (!fanCounts.has(c.fan_id)) fanCounts.set(c.fan_id, new Set());
    fanCounts.get(c.fan_id)!.add(c.performer_id);
  }

  // Sort by count descending, take top 10
  const sorted = [...fanCounts.entries()]
    .map(([fanId, performers]) => ({ fanId, count: performers.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (sorted.length === 0) return [];

  // Fetch fan names
  const fanIds = sorted.map((s) => s.fanId);
  const { data: fans } = await admin
    .from("fans")
    .select("id, name, email")
    .in("id", fanIds);

  const fanMap = new Map(
    (fans || []).map((f) => [f.id, f.name || f.email || "Anonymous"])
  );

  return sorted.map((s, i) => ({
    rank: i + 1,
    fanId: s.fanId,
    name: fanMap.get(s.fanId) || "Anonymous",
    count: s.count,
    topTier: getTierFromCount(s.count),
  }));
}

async function fetchPerformerLeaderboard(
  admin: ReturnType<typeof createSupabaseAdmin>,
  since?: Date
): Promise<PerformerEntry[]> {
  let query = admin
    .from("collections")
    .select("fan_id, performer_id, created_at");

  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data: collections } = await query;
  if (!collections || collections.length === 0) return [];

  // Group by performer_id, count distinct fan_ids
  const performerCounts = new Map<string, Set<string>>();
  for (const c of collections) {
    if (!performerCounts.has(c.performer_id))
      performerCounts.set(c.performer_id, new Set());
    performerCounts.get(c.performer_id)!.add(c.fan_id);
  }

  // Sort by count descending, take top 10
  const sorted = [...performerCounts.entries()]
    .map(([performerId, fans]) => ({
      performerId,
      fanCount: fans.size,
    }))
    .sort((a, b) => b.fanCount - a.fanCount)
    .slice(0, 10);

  if (sorted.length === 0) return [];

  // Fetch performer details
  const performerIds = sorted.map((s) => s.performerId);
  const { data: performers } = await admin
    .from("performers")
    .select("id, name, slug, photo_url")
    .in("id", performerIds);

  const performerMap = new Map(
    (performers || []).map((p) => [
      p.id,
      { name: p.name, slug: p.slug, photoUrl: p.photo_url },
    ])
  );

  return sorted.map((s, i) => ({
    rank: i + 1,
    performerId: s.performerId,
    name: performerMap.get(s.performerId)?.name || "Unknown",
    slug: performerMap.get(s.performerId)?.slug || "",
    photoUrl: performerMap.get(s.performerId)?.photoUrl || null,
    fanCount: s.fanCount,
  }));
}

export default async function LeaderboardPage() {
  const admin = createSupabaseAdmin();

  // Get current user session (optional — for "your position" highlight)
  let currentFanId: string | null = null;
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const { data: fan } = await admin
        .from("fans")
        .select("id")
        .eq("email", user.email)
        .single();
      currentFanId = fan?.id || null;
    }
  } catch {
    // No session — that's fine, leaderboard is public
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all three time periods in parallel
  const [weeklyFans, weeklyPerformers, monthlyFans, monthlyPerformers, allTimeFans, allTimePerformers] =
    await Promise.all([
      fetchFanLeaderboard(admin, weekAgo),
      fetchPerformerLeaderboard(admin, weekAgo),
      fetchFanLeaderboard(admin, monthAgo),
      fetchPerformerLeaderboard(admin, monthAgo),
      fetchFanLeaderboard(admin),
      fetchPerformerLeaderboard(admin),
    ]);

  const leaderboardData = {
    weekly: { fans: weeklyFans, performers: weeklyPerformers },
    monthly: { fans: monthlyFans, performers: monthlyPerformers },
    allTime: { fans: allTimeFans, performers: allTimePerformers },
  };

  return (
    <main className="min-h-screen bg-bg px-4 pb-16 pt-20">
      <LeaderboardClient data={leaderboardData} currentFanId={currentFanId} />
    </main>
  );
}
