import { createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const performerId = formData.get("performer_id") as string;
    const userId = formData.get("user_id") as string;

    if (!performerId || !userId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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

    // Claim it
    await supabase
      .from("performers")
      .update({ claimed: true, claimed_by: userId, updated_at: new Date().toISOString() })
      .eq("id", performerId);

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
