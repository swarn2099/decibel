import { createSupabaseAdmin } from "@/lib/supabase";

type NotificationPreferences = {
  nearby_events: boolean;
  badge_unlocks: boolean;
  tier_ups: boolean;
  artist_messages: boolean;
  friend_joins: boolean;
  weekly_recap: boolean;
};

type PreferenceKey = keyof NotificationPreferences;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Daily cap: max notifications per user per UTC day */
const DAILY_CAP = 3;

interface SendParams {
  userId: string;
  title: string;
  body: string;
  data: Record<string, string>;
  preferenceKey: PreferenceKey;
}

interface SendResult {
  sent: boolean;
  reason?: string;
}

interface BulkSendParams {
  userIds: string[];
  title: string;
  body: string;
  data: Record<string, string>;
  preferenceKey: PreferenceKey;
}

interface BulkSendResult {
  sent: number;
  skipped: number;
}

/** Returns today's UTC date boundaries as ISO strings */
function todayUTCBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Send a push notification to a single user via Expo Push API.
 * Checks notification preferences before sending.
 * Enforces 3/day rate limit via notifications_log.
 * Supports multiple devices per user.
 */
export async function sendPushNotification(
  params: SendParams
): Promise<SendResult> {
  const { userId, title, body, data, preferenceKey } = params;
  const supabase = createSupabaseAdmin();

  // Check daily cap via notifications_log
  const { start, end } = todayUTCBounds();
  const { count } = await supabase
    .from("notifications_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("sent_at", start)
    .lt("sent_at", end);

  if ((count ?? 0) >= DAILY_CAP) {
    return { sent: false, reason: "daily_cap_reached" };
  }

  // Get all push tokens for this user (multi-device)
  const { data: tokenRows } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", userId);

  if (!tokenRows || tokenRows.length === 0) {
    return { sent: false, reason: "no_push_token" };
  }

  // Check notification preferences
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  // If no preferences row, assume all enabled (default true)
  if (prefs && prefs[preferenceKey] === false) {
    return { sent: false, reason: "preference_disabled" };
  }

  // Build messages for all devices
  const tokens = tokenRows.map((row) => row.expo_push_token);
  const messages = tokens.map((token) => ({
    to: token,
    sound: "default" as const,
    title,
    body,
    data,
    channelId: "default",
  }));

  // Send via Expo Push API (single message or array)
  try {
    const payload = messages.length === 1 ? messages[0] : messages;
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { sent: false, reason: `expo_api_error_${response.status}` };
    }

    // Log successful send to notifications_log
    const notifType = data.type ?? preferenceKey;
    await supabase.from("notifications_log").insert({
      user_id: userId,
      type: notifType,
      title,
      body,
      data,
    });

    return { sent: true };
  } catch (error) {
    console.error("Push notification send failed:", error);
    return { sent: false, reason: "fetch_error" };
  }
}

/**
 * Send push notifications to multiple users via Expo Push API.
 * Batches into chunks of 100 (Expo API limit).
 * Checks notification preferences before sending.
 * Enforces 3/day rate limit per user via notifications_log.
 * Supports multiple devices per user.
 */
export async function sendBulkPushNotifications(
  params: BulkSendParams
): Promise<BulkSendResult> {
  const { userIds, title, body, data, preferenceKey } = params;

  if (userIds.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  const supabase = createSupabaseAdmin();

  // Check daily cap for all users (batch query)
  const { start, end } = todayUTCBounds();
  const { data: logRows } = await supabase
    .from("notifications_log")
    .select("user_id")
    .in("user_id", userIds)
    .gte("sent_at", start)
    .lt("sent_at", end);

  // Count sends per user today
  const sendCountByUser: Record<string, number> = {};
  if (logRows) {
    for (const row of logRows) {
      sendCountByUser[row.user_id] = (sendCountByUser[row.user_id] ?? 0) + 1;
    }
  }
  const cappedUsers = new Set(
    Object.entries(sendCountByUser)
      .filter(([, count]) => count >= DAILY_CAP)
      .map(([uid]) => uid)
  );

  // Get push tokens for all users (multi-device: multiple rows per user)
  const { data: tokenRows } = await supabase
    .from("push_tokens")
    .select("user_id, expo_push_token")
    .in("user_id", userIds);

  if (!tokenRows || tokenRows.length === 0) {
    return { sent: 0, skipped: userIds.length };
  }

  // Get notification preferences for all users
  const { data: prefRows } = await supabase
    .from("notification_preferences")
    .select("*")
    .in("user_id", userIds);

  // Build a set of users who have disabled this notification type
  const disabledUsers = new Set<string>();
  if (prefRows) {
    for (const pref of prefRows) {
      const prefRecord = pref as Record<string, unknown>;
      if (prefRecord[preferenceKey] === false) {
        disabledUsers.add(prefRecord.user_id as string);
      }
    }
  }

  // Filter: token must exist, preference not disabled, daily cap not hit
  const eligibleRows = tokenRows.filter(
    (row) =>
      row.expo_push_token &&
      !disabledUsers.has(row.user_id) &&
      !cappedUsers.has(row.user_id)
  );

  // Deduplicate eligible user_ids for skip count (by user, not by device)
  const eligibleUserIds = new Set(eligibleRows.map((r) => r.user_id));
  const skipped = userIds.length - eligibleUserIds.size;

  if (eligibleRows.length === 0) {
    return { sent: 0, skipped };
  }

  const eligibleTokens = eligibleRows.map((row) => row.expo_push_token);

  // Batch into chunks of 100
  const BATCH_SIZE = 100;
  let sentCount = 0;
  const sentUserIds: string[] = [];

  for (let i = 0; i < eligibleTokens.length; i += BATCH_SIZE) {
    const batchTokens = eligibleTokens.slice(i, i + BATCH_SIZE);
    const batchRows = eligibleRows.slice(i, i + BATCH_SIZE);
    const messages = batchTokens.map((token) => ({
      to: token,
      sound: "default" as const,
      title,
      body,
      data,
      channelId: "default",
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });

      if (response.ok) {
        sentCount += batchTokens.length;
        sentUserIds.push(...batchRows.map((r) => r.user_id));
      }
    } catch (error) {
      console.error("Bulk push notification batch failed:", error);
    }
  }

  // Batch log successful sends (one log entry per user, not per device)
  if (sentUserIds.length > 0) {
    const uniqueSentUserIds = [...new Set(sentUserIds)];
    const notifType = data.type ?? preferenceKey;
    const logEntries = uniqueSentUserIds.map((uid) => ({
      user_id: uid,
      type: notifType,
      title,
      body,
      data,
    }));
    await supabase.from("notifications_log").insert(logEntries);
  }

  return { sent: sentCount, skipped };
}

/**
 * Placeholder for friend join notification check.
 * Contact import is deferred to v4.0 -- this function is a stub.
 */
export async function checkFriendJoined(newUserId: string): Promise<void> {
  console.log(
    `friend join check: not yet implemented (user: ${newUserId}). Contact import deferred to v4.0.`
  );
}
