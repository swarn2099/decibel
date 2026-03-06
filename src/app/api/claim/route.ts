import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Authenticate via session — never trust form-submitted user_id
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const performerId = formData.get("performer_id") as string;

    if (!performerId) {
      return NextResponse.json({ error: "Missing performer_id" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Check performer isn't already claimed
    const { data: performer } = await supabase
      .from("performers")
      .select("id, claimed")
      .eq("id", performerId)
      .single();

    if (!performer) {
      return NextResponse.json({ error: "Performer not found" }, { status: 404 });
    }

    if (performer.claimed) {
      return NextResponse.json({ error: "Already claimed" }, { status: 409 });
    }

    // Claim it using session user identity
    await supabase
      .from("performers")
      .update({ claimed: true, claimed_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", performerId);

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
