import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { BADGE_DEFINITIONS } from "@/lib/badges/definitions";
import type { BadgeWithDefinition, BadgeId } from "@/lib/types/badges";

export async function GET() {
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
    return NextResponse.json({ badges: [] });
  }

  // Query earned badges
  const { data: earnedRows } = await admin
    .from("fan_badges")
    .select("badge_id, fan_id, earned_at")
    .eq("fan_id", fan.id)
    .order("earned_at", { ascending: false });

  const badges: BadgeWithDefinition[] = (earnedRows ?? [])
    .filter((row) => row.badge_id in BADGE_DEFINITIONS)
    .map((row) => ({
      badge_id: row.badge_id as BadgeId,
      fan_id: row.fan_id,
      earned_at: row.earned_at,
      definition: BADGE_DEFINITIONS[row.badge_id as BadgeId],
    }));

  return NextResponse.json({ badges });
}
