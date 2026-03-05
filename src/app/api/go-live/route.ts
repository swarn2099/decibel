import { createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { performer_id, venue_id } = await req.json();

    if (!performer_id || !venue_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const today = new Date().toISOString().split("T")[0];

    // Create or update today's event
    const { error } = await supabase.from("events").upsert(
      {
        performer_id,
        venue_id,
        event_date: today,
        start_time: new Date().toISOString(),
        is_live: true,
        source: "manual",
      },
      { onConflict: "performer_id,venue_id,event_date" }
    );

    if (error) {
      // If unique constraint doesn't exist on that combo, just insert
      await supabase.from("events").insert({
        performer_id,
        venue_id,
        event_date: today,
        start_time: new Date().toISOString(),
        is_live: true,
        source: "manual",
      });
    }

    return NextResponse.json({ status: "live" });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
