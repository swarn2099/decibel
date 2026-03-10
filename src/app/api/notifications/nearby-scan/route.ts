import { createSupabaseAdmin } from "@/lib/supabase";
import { sendBulkPushNotifications } from "@/lib/pushNotifications";
import { NextRequest, NextResponse } from "next/server";

/**
 * Daily cron endpoint: scan tomorrow's events and notify fans who collected
 * those artists and live in the same city as the venue.
 *
 * Triggered by Vercel cron (GET only).
 * Auth: Bearer ${CRON_SECRET} in Authorization header (same pattern as weekly-recap).
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authorization via CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("Authorization");

    const isAuthorized =
      !cronSecret || authHeader === `Bearer ${cronSecret}`;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    // Get tomorrow's date as YYYY-MM-DD
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Query tomorrow's events with venue and performer details
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select(
        "id, performer_id, venue_id, venues(name, city), performers(name, slug, city)"
      )
      .eq("event_date", tomorrowStr);

    if (eventsError) {
      console.error("nearby-scan: failed to fetch events:", eventsError);
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        sent: 0,
        events: 0,
        date: tomorrowStr,
        message: "No events tomorrow",
      });
    }

    let totalSent = 0;
    const eventsCount = events.length;

    for (const event of events) {
      const venueRaw = event.venues as
        | { name: string; city: string }
        | { name: string; city: string }[]
        | null;
      const performerRaw = event.performers as
        | { name: string; slug: string; city: string }
        | { name: string; slug: string; city: string }[]
        | null;

      const venue = Array.isArray(venueRaw) ? venueRaw[0] : venueRaw;
      const performer = Array.isArray(performerRaw)
        ? performerRaw[0]
        : performerRaw;

      if (!venue || !performer) continue;

      // Get all fans who collected this performer AND live in the venue's city
      const { data: fanCollections } = await supabase
        .from("collections")
        .select("fan_id, fans!inner(id, city)")
        .eq("performer_id", event.performer_id)
        .eq("fans.city", venue.city);

      if (!fanCollections || fanCollections.length === 0) continue;

      const fanIds = fanCollections.map((c) => c.fan_id);

      const result = await sendBulkPushNotifications({
        userIds: fanIds,
        title: `${performer.name} is throwing down tomorrow 🔥`,
        body: `Catch them at ${venue.name}`,
        data: { type: "event", slug: performer.slug },
        preferenceKey: "nearby_events",
      });

      totalSent += result.sent;
    }

    return NextResponse.json({
      sent: totalSent,
      events: eventsCount,
      date: tomorrowStr,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
