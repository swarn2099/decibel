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

export async function POST(req: NextRequest) {
  const fanId = await getFanId(req);
  if (!fanId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { target_fan_id } = await req.json();
  if (!target_fan_id) {
    return NextResponse.json({ error: "target_fan_id required" }, { status: 400 });
  }
  if (fanId === target_fan_id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const { error } = await admin.from("fan_follows").upsert(
    { follower_id: fanId, following_id: target_fan_id },
    { onConflict: "follower_id,following_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const fanId = await getFanId(req);
  if (!fanId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetFanId = req.nextUrl.searchParams.get("target_fan_id");
  if (!targetFanId) {
    return NextResponse.json({ error: "target_fan_id required" }, { status: 400 });
  }

  const { error } = await admin
    .from("fan_follows")
    .delete()
    .eq("follower_id", fanId)
    .eq("following_id", targetFanId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
