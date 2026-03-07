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

export type FounderEntry = {
  rank: number;
  fanId: string;
  name: string;
  avatarUrl: string | null;
  foundedCount: number;
};

export type FoundedArtistEntry = {
  rank: number;
  performerId: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  followerCount: number;
  founderName: string;
  founderSlug: string;
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
    .select("id, name")
    .in("id", fanIds);

  const fanMap = new Map(
    (fans || []).map((f) => [f.id, f.name || "Anonymous"])
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

async function fetchFounderLeaderboard(
  admin: ReturnType<typeof createSupabaseAdmin>
): Promise<{ topFounders: FounderEntry[]; foundedArtists: FoundedArtistEntry[] }> {
  const { data: badges } = await admin
    .from("founder_badges")
    .select("fan_id, performer_id");

  if (!badges || badges.length === 0)
    return { topFounders: [], foundedArtists: [] };

  // --- Top founders by count ---
  const founderCounts = new Map<string, number>();
  for (const b of badges) {
    founderCounts.set(b.fan_id, (founderCounts.get(b.fan_id) || 0) + 1);
  }

  const sortedFounders = [...founderCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const fanIds = sortedFounders.map(([id]) => id);
  const { data: fans } = await admin
    .from("fans")
    .select("id, name, avatar_url")
    .in("id", fanIds);

  const fanMap = new Map(
    (fans || []).map((f) => [f.id, { name: f.name || "Anonymous", avatarUrl: f.avatar_url }])
  );

  const topFounders: FounderEntry[] = sortedFounders.map(([fanId, count], i) => ({
    rank: i + 1,
    fanId,
    name: fanMap.get(fanId)?.name || "Anonymous",
    avatarUrl: fanMap.get(fanId)?.avatarUrl || null,
    foundedCount: count,
  }));

  // --- Founded artists by follower count ---
  const performerIds = badges.map((b) => b.performer_id);
  const { data: performers } = await admin
    .from("performers")
    .select("id, name, slug, photo_url, follower_count")
    .in("id", performerIds)
    .order("follower_count", { ascending: false, nullsFirst: false });

  // Map performer -> founder
  const performerToFounder = new Map<string, string>();
  for (const b of badges) {
    performerToFounder.set(b.performer_id, b.fan_id);
  }

  // Need all fan IDs for founder names
  const allFounderIds = [...new Set(badges.map((b) => b.fan_id))];
  const { data: allFans } = await admin
    .from("fans")
    .select("id, name")
    .in("id", allFounderIds);

  const allFanMap = new Map(
    (allFans || []).map((f) => [f.id, f.name || "Anonymous"])
  );

  const { generateFanSlug } = await import("@/lib/fan-slug");

  const foundedArtists: FoundedArtistEntry[] = (performers || []).map((p, i) => {
    const founderId = performerToFounder.get(p.id) || "";
    const founderName = allFanMap.get(founderId) || "Anonymous";
    return {
      rank: i + 1,
      performerId: p.id,
      name: p.name,
      slug: p.slug,
      photoUrl: p.photo_url,
      followerCount: p.follower_count || 0,
      founderName,
      founderSlug: generateFanSlug({ name: founderName === "Anonymous" ? null : founderName, id: founderId }),
    };
  });

  return { topFounders, foundedArtists };
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

  // Fetch all three time periods + founders in parallel
  const [weeklyFans, weeklyPerformers, monthlyFans, monthlyPerformers, allTimeFans, allTimePerformers, founderData] =
    await Promise.all([
      fetchFanLeaderboard(admin, weekAgo),
      fetchPerformerLeaderboard(admin, weekAgo),
      fetchFanLeaderboard(admin, monthAgo),
      fetchPerformerLeaderboard(admin, monthAgo),
      fetchFanLeaderboard(admin),
      fetchPerformerLeaderboard(admin),
      fetchFounderLeaderboard(admin),
    ]);

  const leaderboardData = {
    weekly: { fans: weeklyFans, performers: weeklyPerformers },
    monthly: { fans: monthlyFans, performers: monthlyPerformers },
    allTime: { fans: allTimeFans, performers: allTimePerformers },
  };

  return (
    <main className="min-h-screen bg-bg px-4 pb-16 pt-20">
      <LeaderboardClient data={leaderboardData} currentFanId={currentFanId} founderData={founderData} />
    </main>
  );
}
