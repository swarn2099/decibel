import { createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { performer_id, subject, body, target_tier } = await req.json();

    if (!performer_id || !body) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Count recipients
    let query = supabase
      .from("fan_tiers")
      .select("*", { count: "exact", head: true })
      .eq("performer_id", performer_id);

    if (target_tier) {
      query = query.eq("current_tier", target_tier);
    }

    const { count } = await query;

    // Store message
    const { error } = await supabase.from("messages").insert({
      performer_id,
      subject: subject || null,
      body,
      target_tier: target_tier || null,
      recipient_count: count || 0,
    });

    if (error) {
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }

    // TODO: Actually send via SendGrid when configured
    // For now, just record the message

    return NextResponse.json({ sent: true, recipient_count: count || 0 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
