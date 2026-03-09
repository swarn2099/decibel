import { createSupabaseAdmin } from "@/lib/supabase";
import { sendBulkPushNotifications } from "@/lib/pushNotifications";
import { NextRequest, NextResponse } from "next/server";

/**
 * Nearby event notification endpoint.
 * Called by cron job or admin action when a performer is playing at a venue.
 * Notifies all fans who have collected this performer.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authorization
    const secret = process.env.NOTIFICATION_SECRET;
    if (secret) {
      const headerSecret = req.headers.get("X-Notification-Secret");
      if (headerSecret !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { eventId, performerId, venueName } = await req.json();

    if (!performerId || !venueName) {
      return NextResponse.json(
        { error: "Missing required fields: performerId, venueName" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get performer info
    const { data: performer } = await supabase
      .from("performers")
      .select("name, slug")
      .eq("id", performerId)
      .single();

    if (!performer) {
      return NextResponse.json(
        { error: "Performer not found" },
        { status: 404 }
      );
    }

    // Get all fans who have collected this performer
    const { data: collections } = await supabase
      .from("collections")
      .select("fan_id")
      .eq("performer_id", performerId);

    if (!collections || collections.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0, reason: "no_fans" });
    }

    // Deduplicate fan IDs
    const fanIds = [...new Set(collections.map((c) => c.fan_id))];

    const result = await sendBulkPushNotifications({
      userIds: fanIds,
      title: `${performer.name} is playing tonight`,
      body: `Catch them at ${venueName}`,
      data: { type: "artist", slug: performer.slug || "" },
      preferenceKey: "nearby_events",
    });

    return NextResponse.json({
      sent: result.sent,
      skipped: result.skipped,
      eventId: eventId || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
