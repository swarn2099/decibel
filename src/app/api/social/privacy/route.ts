import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import type { PrivacySetting } from "@/lib/types/social";

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();

  // Get fan record
  const { data: fan } = await admin
    .from("fans")
    .select("id")
    .eq("email", user.email!)
    .single();

  if (!fan) {
    return NextResponse.json({ error: "Fan not found" }, { status: 404 });
  }

  const { data: privacy } = await admin
    .from("fan_privacy")
    .select("visibility")
    .eq("fan_id", fan.id)
    .maybeSingle();

  return NextResponse.json({
    visibility: (privacy?.visibility as PrivacySetting) || "public",
  });
}

export async function PUT(req: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { visibility } = await req.json();

  if (!["public", "private", "mutual"].includes(visibility)) {
    return NextResponse.json({ error: "Invalid visibility setting" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  const { data: fan } = await admin
    .from("fans")
    .select("id")
    .eq("email", user.email!)
    .single();

  if (!fan) {
    return NextResponse.json({ error: "Fan not found" }, { status: 404 });
  }

  const { error } = await admin.from("fan_privacy").upsert(
    {
      fan_id: fan.id,
      visibility,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "fan_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ visibility });
}
