import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawName = body.name;
  if (typeof rawName !== "string" || rawName.trim().length === 0) {
    return NextResponse.json(
      { error: "Name must be a non-empty string" },
      { status: 400 }
    );
  }

  const name = rawName.trim().slice(0, 50);
  const admin = createSupabaseAdmin();

  // Try update first
  const { data, error } = await admin
    .from("fans")
    .update({ name })
    .eq("email", user.email)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If no row was updated, upsert (fan doesn't have a fans row yet)
  if (!data || data.length === 0) {
    const { error: upsertError } = await admin
      .from("fans")
      .upsert({ email: user.email, name }, { onConflict: "email" });

    if (upsertError) {
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
