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

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "10"),
    50
  );

  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const { data: fans, error } = await admin
    .from("fans")
    .select("id, name, avatar_url")
    .ilike("name", `%${q}%`)
    .neq("id", fanId)
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check follow status for results
  const fanIds = (fans ?? []).map((f) => f.id as string);
  const { data: myFollows } = await admin
    .from("fan_follows")
    .select("following_id")
    .eq("follower_id", fanId)
    .in("following_id", fanIds.length > 0 ? fanIds : ["none"]);

  const followSet = new Set((myFollows ?? []).map((f: { following_id: string }) => f.following_id));

  // Get stamp counts
  const { data: stampCounts } = await admin
    .from("collections")
    .select("fan_id")
    .in("fan_id", fanIds.length > 0 ? fanIds : ["none"]);

  const countMap = new Map<string, number>();
  (stampCounts ?? []).forEach((s: { fan_id: string }) => {
    countMap.set(s.fan_id, (countMap.get(s.fan_id) ?? 0) + 1);
  });

  const users = (fans ?? []).map((f) => ({
    id: f.id as string,
    display_name: (f.name as string) ?? "Anonymous",
    avatar_url: (f.avatar_url as string) ?? null,
    stamp_count: countMap.get(f.id as string) ?? 0,
    is_following: followSet.has(f.id as string),
  }));

  return NextResponse.json({ users });
}
