import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user?.email) return null;
  return data.user.email;
}

export async function POST(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    updates.name = body.name.trim().slice(0, 50) || null;
  }
  if (typeof body.avatar_url === "string") {
    updates.avatar_url = body.avatar_url;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Try update first
  const { data } = await admin
    .from("fans")
    .update(updates)
    .eq("email", email)
    .select("id, name, avatar_url");

  if (!data || data.length === 0) {
    // Fan doesn't exist yet — upsert
    const { error: upsertError } = await admin
      .from("fans")
      .upsert({ email, ...updates }, { onConflict: "email" });

    if (upsertError) {
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
