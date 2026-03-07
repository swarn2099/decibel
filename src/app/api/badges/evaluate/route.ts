import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { checkNewBadges } from "@/lib/badges/engine";

export async function POST() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();

  // Look up fan by email
  const { data: fan } = await admin
    .from("fans")
    .select("id")
    .eq("email", user.email)
    .single();

  if (!fan) {
    return NextResponse.json({ newBadges: [], total: 0 });
  }

  const newBadges = await checkNewBadges(fan.id, admin);

  // Get total badge count
  const { count } = await admin
    .from("fan_badges")
    .select("id", { count: "exact", head: true })
    .eq("fan_id", fan.id);

  return NextResponse.json({
    newBadges,
    total: count ?? 0,
  });
}
