import { sendPushNotification } from "@/lib/pushNotifications";
import { NextRequest, NextResponse } from "next/server";

type NotificationType =
  | "nearby_event"
  | "badge"
  | "tier_up"
  | "artist_message"
  | "friend_join"
  | "weekly_recap";

const typeToPreferenceKey: Record<
  NotificationType,
  | "nearby_events"
  | "badge_unlocks"
  | "tier_ups"
  | "artist_messages"
  | "friend_joins"
  | "weekly_recap"
> = {
  nearby_event: "nearby_events",
  badge: "badge_unlocks",
  tier_up: "tier_ups",
  artist_message: "artist_messages",
  friend_join: "friend_joins",
  weekly_recap: "weekly_recap",
};

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

    const { userId, type, title, body, data } = await req.json();

    if (!userId || !type || !title || !body) {
      return NextResponse.json(
        { error: "Missing required fields: userId, type, title, body" },
        { status: 400 }
      );
    }

    const preferenceKey = typeToPreferenceKey[type as NotificationType];
    if (!preferenceKey) {
      return NextResponse.json(
        { error: `Invalid notification type: ${type}` },
        { status: 400 }
      );
    }

    const result = await sendPushNotification({
      userId,
      title,
      body,
      data: data || {},
      preferenceKey,
    });

    return NextResponse.json({ sent: result.sent, reason: result.reason });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
