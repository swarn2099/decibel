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

export async function GET(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get fan
  const { data: fan } = await admin
    .from("fans")
    .select("id")
    .eq("email", email)
    .single();

  if (!fan) {
    return NextResponse.json({ earned: [], totalFans: 0, holderCounts: {} });
  }

  // Get earned badges
  const { data: earned } = await admin
    .from("fan_badges")
    .select("badge_id, earned_at")
    .eq("fan_id", fan.id);

  // Get total fans + all badge counts for rarity
  const [{ count: totalFans }, { data: allBadges }] = await Promise.all([
    admin.from("fans").select("id", { count: "exact", head: true }),
    admin.from("fan_badges").select("badge_id"),
  ]);

  const holderCounts: Record<string, number> = {};
  for (const row of allBadges ?? []) {
    holderCounts[row.badge_id] = (holderCounts[row.badge_id] ?? 0) + 1;
  }

  return NextResponse.json({
    earned: (earned ?? []).map((b: { badge_id: string; earned_at: string }) => ({
      badge_id: b.badge_id,
      earned_at: b.earned_at,
    })),
    totalFans: totalFans ?? 0,
    holderCounts,
  });
}
