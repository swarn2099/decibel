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

  // Get current user's fan ID for is_following check
  const { data: currentFan } = await admin
    .from("fans")
    .select("id")
    .eq("email", authData.user.email)
    .single();

  const { data: follows, error } = await admin
    .from("fan_follows")
    .select("follower:fans!fan_follows_follower_id_fkey(id, name, avatar_url)")
    .eq("following_id", fanId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check which followers the current user follows
  const followerIds = (follows ?? []).map((f: Record<string, unknown>) => {
    const fan = Array.isArray(f.follower) ? f.follower[0] : f.follower;
    return (fan as Record<string, unknown>)?.id as string;
  }).filter(Boolean);

  const { data: myFollows } = currentFan ? await admin
    .from("fan_follows")
    .select("following_id")
    .eq("follower_id", currentFan.id)
    .in("following_id", followerIds.length > 0 ? followerIds : ["none"]) : { data: [] };

  const myFollowSet = new Set((myFollows ?? []).map((f: { following_id: string }) => f.following_id));

  const users = (follows ?? []).map((f: Record<string, unknown>) => {
    const fan = Array.isArray(f.follower) ? f.follower[0] : f.follower;
    const fanObj = fan as Record<string, unknown>;
    return {
      id: fanObj?.id as string,
      display_name: (fanObj?.name as string) ?? "Anonymous",
      avatar_url: (fanObj?.avatar_url as string) ?? null,
      stamp_count: 0,
      is_following: myFollowSet.has(fanObj?.id as string),
    };
  });

  return NextResponse.json({ users });
}
