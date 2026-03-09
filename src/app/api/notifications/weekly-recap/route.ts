import { createSupabaseAdmin } from "@/lib/supabase";
import { sendBulkPushNotifications } from "@/lib/pushNotifications";
import { NextResponse, NextRequest } from "next/server";

/**
 * Weekly recap notification endpoint.
 * Designed to be triggered by Vercel cron or manual call.
 * Sends each fan a summary of their week in music.
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authorization via CRON_SECRET or NOTIFICATION_SECRET
    const cronSecret = process.env.CRON_SECRET;
    const notifSecret = process.env.NOTIFICATION_SECRET;
    const authHeader = req.headers.get("Authorization");
    const notifHeader = req.headers.get("X-Notification-Secret");

    const isAuthorized =
      (!cronSecret && !notifSecret) ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (notifSecret && notifHeader === notifSecret);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    // Get the date range for this week (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Get all fans who have at least 1 collection
    const { data: fans } = await supabase
      .from("fans")
      .select("id")
      .not("id", "is", null);

    if (!fans || fans.length === 0) {
      return NextResponse.json({ sent: 0, message: "No fans found" });
    }

    const fanIds = fans.map((f) => f.id);

    // Get collections this week grouped by fan
    const { data: weekCollections } = await supabase
      .from("collections")
      .select("fan_id")
      .in("fan_id", fanIds)
      .gte("created_at", weekAgo)
      .lte("created_at", now);

    // Get badges this week grouped by fan
    const { data: weekBadges } = await supabase
      .from("fan_badges")
      .select("fan_id")
      .in("fan_id", fanIds)
      .gte("earned_at", weekAgo)
      .lte("earned_at", now);

    // Count per fan
    const collectionCounts = new Map<string, number>();
    const badgeCounts = new Map<string, number>();

    if (weekCollections) {
      for (const c of weekCollections) {
        collectionCounts.set(
          c.fan_id,
          (collectionCounts.get(c.fan_id) || 0) + 1
        );
      }
    }

    if (weekBadges) {
      for (const b of weekBadges) {
        badgeCounts.set(b.fan_id, (badgeCounts.get(b.fan_id) || 0) + 1);
      }
    }

    // Only notify fans who had activity this week
    const activeFanIds = [
      ...new Set([
        ...collectionCounts.keys(),
        ...badgeCounts.keys(),
      ]),
    ];

    if (activeFanIds.length === 0) {
      return NextResponse.json({
        sent: 0,
        message: "No fan activity this week",
      });
    }

    // Build per-fan notification bodies
    // For bulk send, we use a generic message since bulk API sends same content
    const totalCollections = [...collectionCounts.values()].reduce(
      (a, b) => a + b,
      0
    );
    const totalBadges = [...badgeCounts.values()].reduce((a, b) => a + b, 0);

    const bodyParts: string[] = [];
    if (totalCollections > 0) {
      bodyParts.push(
        `${activeFanIds.length} fans collected ${totalCollections} artists`
      );
    }
    if (totalBadges > 0) {
      bodyParts.push(`${totalBadges} badges earned`);
    }

    const result = await sendBulkPushNotifications({
      userIds: activeFanIds,
      title: "Your Week in Music 🎵",
      body:
        bodyParts.length > 0
          ? bodyParts.join(", ")
          : "Check out your passport for this week's highlights",
      data: { type: "passport" },
      preferenceKey: "weekly_recap",
    });

    return NextResponse.json({
      sent: result.sent,
      skipped: result.skipped,
      activeFans: activeFanIds.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
