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

  const { data, error } = await admin
    .from("collections")
    .select(
      `
      id,
      fan_id,
      performer_id,
      venue_id,
      verified,
      is_founder,
      scan_count,
      current_tier,
      created_at,
      performer:performers!inner(id, name, slug, photo_url, genre),
      venue:venues(id, name, city)
    `
    )
    .eq("fan_id", fanId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ collections: data ?? [] });
}
