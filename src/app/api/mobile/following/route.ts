import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: authData, error: authError } = await admin.auth.getUser(auth.slice(7));
  if (authError || !authData.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fanId = req.nextUrl.searchParams.get("fan_id");
  if (!fanId) {
    return NextResponse.json({ error: "fan_id required" }, { status: 400 });
  }

  const { data: follows, error } = await admin
    .from("fan_follows")
    .select("following:fans!fan_follows_following_id_fkey(id, name, avatar_url)")
    .eq("follower_id", fanId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (follows ?? []).map((f: Record<string, unknown>) => {
    const fan = Array.isArray(f.following) ? f.following[0] : f.following;
    const fanObj = fan as Record<string, unknown>;
    return {
      id: fanObj?.id as string,
      display_name: (fanObj?.name as string) ?? "Anonymous",
      avatar_url: (fanObj?.avatar_url as string) ?? null,
      stamp_count: 0,
      is_following: true,
    };
  });

  // Fetch real stamp counts for all followed users
  if (users.length > 0) {
    const userIds = users.map((u) => u.id);
    const { data: counts } = await admin
      .from("collections")
      .select("fan_id")
      .in("fan_id", userIds);

    if (counts) {
      const countMap: Record<string, number> = {};
      for (const row of counts) {
        countMap[row.fan_id] = (countMap[row.fan_id] ?? 0) + 1;
      }
      for (const user of users) {
        user.stamp_count = countMap[user.id] ?? 0;
      }
    }
  }

  return NextResponse.json({ users });
}
