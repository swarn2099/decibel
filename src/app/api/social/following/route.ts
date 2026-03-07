import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const fanId = req.nextUrl.searchParams.get("fanId");
  const countOnly = req.nextUrl.searchParams.get("countOnly");

  if (!fanId) {
    return NextResponse.json({ error: "fanId required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  if (countOnly === "true") {
    const { count } = await admin
      .from("fan_follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", fanId);

    return NextResponse.json({ count: count ?? 0 });
  }

  const { data, error } = await admin
    .from("fan_follows")
    .select("following_id, created_at, fans!fan_follows_following_id_fkey(id, name)")
    .eq("follower_id", fanId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ following: data || [] });
}
