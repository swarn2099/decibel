import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user?.email) return null;
  return data.user.email;
}

function getDateFilter(period: string): string | null {
  if (period === "allTime") return null;
  const now = new Date();
  const days = period === "weekly" ? 7 : 30;
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

function deriveTier(count: number): string {
  if (count >= 10) return "inner_circle";
  if (count >= 5) return "secret";
  if (count >= 3) return "early_access";
  return "network";
}

export async function GET(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tab = req.nextUrl.searchParams.get("tab") ?? "fans";
  const period = req.nextUrl.searchParams.get("period") ?? "allTime";
  const dateFilter = getDateFilter(period);

  if (tab === "fans") {
    let query = admin
      .from("collections")
      .select("fan_id, fans!inner(id, name, email)");

    if (dateFilter) {
      query = query.gte("collected_at", dateFilter);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const fanMap = new Map<string, { name: string; count: number }>();
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const fanId = row.fan_id as string;
      const fan = row.fans as Record<string, unknown>;
      if (!fan) continue;

      const existing = fanMap.get(fanId);
      if (existing) {
        existing.count++;
      } else {
        const name =
          (fan.name as string) ||
          ((fan.email as string)?.split("@")[0] ?? "Anonymous");
        fanMap.set(fanId, { name, count: 1 });
      }
    }

    const sorted = Array.from(fanMap.entries())
      .map(([fanId, info]) => ({
        fanId,
        name: info.name,
        count: info.count,
        topTier: deriveTier(info.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    return NextResponse.json({ entries: sorted });
  }

  // Performer leaderboard
  let query = admin
    .from("collections")
    .select(
      "fan_id, performer_id, performers!inner(id, name, slug, photo_url, genres)"
    );

  if (dateFilter) {
    query = query.gte("collected_at", dateFilter);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const perfMap = new Map<
    string,
    {
      name: string;
      slug: string;
      photoUrl: string | null;
      genres: string[];
      fanIds: Set<string>;
    }
  >();

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const perfId = row.performer_id as string;
    const perf = row.performers as Record<string, unknown>;
    if (!perf) continue;

    const existing = perfMap.get(perfId);
    if (existing) {
      existing.fanIds.add(row.fan_id as string);
    } else {
      perfMap.set(perfId, {
        name: (perf.name as string) ?? "Unknown",
        slug: (perf.slug as string) ?? perfId,
        photoUrl: (perf.photo_url as string) ?? null,
        genres: (perf.genres as string[]) ?? [],
        fanIds: new Set([row.fan_id as string]),
      });
    }
  }

  const sorted = Array.from(perfMap.entries())
    .map(([performerId, info]) => ({
      performerId,
      name: info.name,
      slug: info.slug,
      photoUrl: info.photoUrl,
      fanCount: info.fanIds.size,
      genres: info.genres,
    }))
    .sort((a, b) => b.fanCount - a.fanCount)
    .slice(0, 100)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  return NextResponse.json({ entries: sorted });
}
