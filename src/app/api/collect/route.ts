import { createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

function calculateTier(scanCount: number): string {
  if (scanCount >= 10) return "inner_circle";
  if (scanCount >= 5) return "secret";
  if (scanCount >= 3) return "early_access";
  return "network";
}

export async function POST(req: NextRequest) {
  try {
    const { performer_id, email } = await req.json();

    if (!performer_id || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Upsert fan by email
    const { data: fan, error: fanError } = await supabase
      .from("fans")
      .upsert({ email }, { onConflict: "email" })
      .select("id")
      .single();

    if (fanError || !fan) {
      return NextResponse.json({ error: "Failed to create fan" }, { status: 500 });
    }

    // Try to insert collection (unique constraint: fan_id + performer_id + event_date)
    const today = new Date().toISOString().split("T")[0];
    const { error: collectionError } = await supabase
      .from("collections")
      .insert({
        fan_id: fan.id,
        performer_id,
        event_date: today,
        capture_method: "qr",
      });

    const alreadyCollected = collectionError?.code === "23505"; // unique violation

    if (collectionError && !alreadyCollected) {
      return NextResponse.json({ error: "Failed to record collection" }, { status: 500 });
    }

    // Get current scan count
    const { count } = await supabase
      .from("collections")
      .select("*", { count: "exact", head: true })
      .eq("fan_id", fan.id)
      .eq("performer_id", performer_id);

    const scanCount = count || 1;
    const currentTier = calculateTier(scanCount);

    // Upsert fan tier
    await supabase
      .from("fan_tiers")
      .upsert(
        {
          fan_id: fan.id,
          performer_id,
          scan_count: scanCount,
          current_tier: currentTier,
          last_scan_date: new Date().toISOString(),
        },
        { onConflict: "fan_id,performer_id" }
      );

    return NextResponse.json({
      scan_count: scanCount,
      current_tier: currentTier,
      already_collected: alreadyCollected,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
