import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getFanId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user?.email) return null;

  const { data: fan } = await admin
    .from("fans")
    .select("id")
    .eq("email", data.user.email)
    .single();
  return fan?.id ?? null;
}

export async function GET(req: NextRequest) {
  const fanId = await getFanId(req);
  if (!fanId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [followingRes, followersRes] = await Promise.all([
    admin
      .from("fan_follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", fanId),
    admin
      .from("fan_follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", fanId),
  ]);

  return NextResponse.json({
    following_count: followingRes.count ?? 0,
    followers_count: followersRes.count ?? 0,
  });
}
