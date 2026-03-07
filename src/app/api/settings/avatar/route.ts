import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("avatar") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // Get fan record
  const { data: fan } = await admin
    .from("fans")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (!fan) {
    return NextResponse.json({ error: "Fan not found" }, { status: 404 });
  }

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${fan.id}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadErr) {
    console.error("Avatar upload error:", uploadErr);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = admin.storage.from("avatars").getPublicUrl(path);

  // Update fan record
  await admin
    .from("fans")
    .update({ avatar_url: urlData.publicUrl })
    .eq("id", fan.id);

  return NextResponse.json({ avatar_url: urlData.publicUrl });
}
