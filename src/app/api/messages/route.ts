import { createSupabaseAdmin } from "@/lib/supabase";
import { sendBulkPushNotifications } from "@/lib/pushNotifications";
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

    // Send push notifications to all fans of this performer (fire-and-forget)
    Promise.resolve().then(async () => {
      // Get performer info
      const { data: performer } = await supabase
        .from("performers")
        .select("name, slug")
        .eq("id", performer_id)
        .single();

      const performerName = performer?.name || "An artist";
      const performerSlug = performer?.slug || "";

      // Get all fan user IDs for this performer (filtered by tier if specified)
      let fanQuery = supabase
        .from("fan_tiers")
        .select("fan_id")
        .eq("performer_id", performer_id);

      if (target_tier) {
        fanQuery = fanQuery.eq("current_tier", target_tier);
      }

      const { data: fanTiers } = await fanQuery;
      if (fanTiers && fanTiers.length > 0) {
        const fanIds = fanTiers.map((ft) => ft.fan_id);
        sendBulkPushNotifications({
          userIds: fanIds,
          title: performerName,
          body: subject || body.substring(0, 100),
          data: { type: "artist", slug: performerSlug },
          preferenceKey: "artist_messages",
        });
      }
    });

    return NextResponse.json({ sent: true, recipient_count: count || 0 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
