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

/**
 * Send a push notification to a single user via Expo Push API.
 * Checks notification preferences before sending.
 */
export async function sendPushNotification(
  params: SendParams
): Promise<SendResult> {
  const { userId, title, body, data, preferenceKey } = params;
  const supabase = createSupabaseAdmin();

  // Get user's push token
  const { data: tokenRow } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", userId)
    .single();

  if (!tokenRow?.expo_push_token) {
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

  // Send via Expo Push API
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: tokenRow.expo_push_token,
        sound: "default",
        title,
        body,
        data,
        channelId: "default",
      }),
    });

    if (!response.ok) {
      return { sent: false, reason: `expo_api_error_${response.status}` };
    }

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
 */
export async function sendBulkPushNotifications(
  params: BulkSendParams
): Promise<BulkSendResult> {
  const { userIds, title, body, data, preferenceKey } = params;

  if (userIds.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  const supabase = createSupabaseAdmin();

  // Get push tokens for all users
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

  // Filter tokens: must have token AND preference not disabled
  const eligibleTokens = tokenRows
    .filter((row) => row.expo_push_token && !disabledUsers.has(row.user_id))
    .map((row) => row.expo_push_token);

  const skipped = userIds.length - eligibleTokens.length;

  if (eligibleTokens.length === 0) {
    return { sent: 0, skipped };
  }

  // Batch into chunks of 100
  const BATCH_SIZE = 100;
  let sentCount = 0;

  for (let i = 0; i < eligibleTokens.length; i += BATCH_SIZE) {
    const batch = eligibleTokens.slice(i, i + BATCH_SIZE);
    const messages = batch.map((token) => ({
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
        sentCount += batch.length;
      }
    } catch (error) {
      console.error("Bulk push notification batch failed:", error);
    }
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
