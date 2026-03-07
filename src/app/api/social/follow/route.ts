import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import type { FollowStatus, FollowResponse } from "@/lib/types/social";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetFanId, action } = await req.json();

  if (!targetFanId || !["follow", "unfollow"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // Look up current user's fan record
  const { data: currentFan } = await admin
    .from("fans")
    .select("id")
    .eq("email", user.email!)
    .single();

  if (!currentFan) {
    return NextResponse.json({ error: "Fan record not found" }, { status: 404 });
  }

  // Prevent self-follow
  if (currentFan.id === targetFanId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  if (action === "follow") {
    const { error } = await admin.from("fan_follows").upsert(
      { follower_id: currentFan.id, following_id: targetFanId },
      { onConflict: "follower_id,following_id" }
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await admin
      .from("fan_follows")
      .delete()
      .eq("follower_id", currentFan.id)
      .eq("following_id", targetFanId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Get updated counts and status
  const [followersRes, followingRes, reverseRes] = await Promise.all([
    admin
      .from("fan_follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", targetFanId),
    admin
      .from("fan_follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", targetFanId),
    // Check if target follows current user back (for mutual status)
    admin
      .from("fan_follows")
      .select("id")
      .eq("follower_id", targetFanId)
      .eq("following_id", currentFan.id)
      .maybeSingle(),
  ]);

  let status: FollowStatus = "not_following";
  if (action === "follow") {
    status = reverseRes.data ? "mutual" : "following";
  }

  const response: FollowResponse = {
    status,
    counts: {
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    },
  };

  return NextResponse.json(response);
}
