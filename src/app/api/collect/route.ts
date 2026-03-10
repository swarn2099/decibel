// PUSH-06 (artist message notifications) handled by /api/messages route
import { createSupabaseAdmin } from "@/lib/supabase";
import { sendPushNotification, checkFriendJoined } from "@/lib/pushNotifications";
import { NextRequest, NextResponse } from "next/server";

function calculateTier(scanCount: number): string {
  if (scanCount >= 10) return "inner_circle";
  if (scanCount >= 5) return "secret";
  if (scanCount >= 3) return "early_access";
  return "network";
}

export async function POST(req: NextRequest) {
  try {
    const { performer_id, email, capture_method } = await req.json();

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
        capture_method: capture_method || "qr",
      });

    const alreadyCollected = collectionError?.code === "23505"; // unique violation

    if (collectionError && !alreadyCollected) {
      return NextResponse.json({ error: "Failed to record collection" }, { status: 500 });
    }

    // Get previous scan count to detect tier changes
    const { data: prevTier } = await supabase
      .from("fan_tiers")
      .select("scan_count, current_tier")
      .eq("fan_id", fan.id)
      .eq("performer_id", performer_id)
      .single();

    const previousTierName = prevTier?.current_tier || null;

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

    // Fire-and-forget: send push notifications for tier-up and badge events
    if (!alreadyCollected) {
      // Get performer info for notification text
      const { data: performer } = await supabase
        .from("performers")
        .select("name, slug")
        .eq("id", performer_id)
        .single();

      const performerName = performer?.name || "an artist";
      const performerSlug = performer?.slug || "";

      // Check for tier change
      if (previousTierName && currentTier !== previousTierName) {
        const tierDisplayName = currentTier
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        Promise.resolve().then(() =>
          sendPushNotification({
            userId: fan.id,
            title: "Tier Up! 🎧",
            body: `You're now ${tierDisplayName} tier with ${performerName}!`,
            data: { type: "artist", slug: performerSlug },
            preferenceKey: "tier_ups",
          })
        );
      }

      // Check for new badges (created in last 5 seconds for this user)
      // PUSH-04: include badge name and description in notification body
      Promise.resolve().then(async () => {
        const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
        const { data: newBadges } = await supabase
          .from("fan_badges")
          .select("badge_type, badges(name, description)")
          .eq("fan_id", fan.id)
          .gte("earned_at", fiveSecondsAgo);

        if (newBadges && newBadges.length > 0) {
          for (const badge of newBadges) {
            const badgeInfo = badge.badges as
              | { name: string; description: string }
              | { name: string; description: string }[]
              | null;
            const resolved = Array.isArray(badgeInfo) ? badgeInfo[0] : badgeInfo;
            const badgeName = resolved?.name ?? badge.badge_type.replace(/_/g, " ");
            const badgeDescription = resolved?.description;
            const body = badgeDescription
              ? `You unlocked ${badgeName}! ${badgeDescription}`
              : `You unlocked the ${badgeName} badge!`;
            sendPushNotification({
              userId: fan.id,
              title: "Badge Earned! 🏆",
              body,
              data: { type: "badge" },
              preferenceKey: "badge_unlocks",
            });
          }
        }
      });
    }

    // PUSH-07: fire friend-joined notification on user's first collection of an artist
    if (!alreadyCollected && scanCount === 1) {
      Promise.resolve().then(() => checkFriendJoined(fan.id, performer_id));
    }

    return NextResponse.json({
      scan_count: scanCount,
      current_tier: currentTier,
      already_collected: alreadyCollected,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
