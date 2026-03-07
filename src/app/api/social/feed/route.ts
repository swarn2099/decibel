import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { generateFanSlug } from "@/lib/fan-slug";
import { BADGE_DEFINITIONS } from "@/lib/badges/definitions";
import type { ActivityFeedItem, ActivityType } from "@/lib/types/social";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const cursor = req.nextUrl.searchParams.get("cursor");

  // Get current fan
  const { data: currentFan } = await admin
    .from("fans")
    .select("id")
    .eq("email", user.email!)
    .single();

  if (!currentFan) {
    return NextResponse.json({ error: "Fan not found" }, { status: 404 });
  }

  // Get list of fans the current user follows
  const { data: following } = await admin
    .from("fan_follows")
    .select("following_id")
    .eq("follower_id", currentFan.id);

  if (!following || following.length === 0) {
    return NextResponse.json({ items: [], hasMore: false });
  }

  const followingIds = following.map((f) => f.following_id);

  // Check privacy settings for each followed fan
  const { data: privacySettings } = await admin
    .from("fan_privacy")
    .select("fan_id, visibility")
    .in("fan_id", followingIds);

  // Check which followed fans also follow the current user back (for mutual check)
  const { data: reverseFollows } = await admin
    .from("fan_follows")
    .select("follower_id")
    .in("follower_id", followingIds)
    .eq("following_id", currentFan.id);

  const reverseFollowSet = new Set(
    (reverseFollows || []).map((r) => r.follower_id)
  );

  const privacyMap = new Map<string, string>();
  for (const p of privacySettings || []) {
    privacyMap.set(p.fan_id, p.visibility);
  }

  // Filter to visible fan IDs based on privacy
  const visibleIds = followingIds.filter((id) => {
    const visibility = privacyMap.get(id) || "public";
    if (visibility === "private") return false;
    if (visibility === "mutual") return reverseFollowSet.has(id);
    return true; // public
  });

  if (visibleIds.length === 0) {
    return NextResponse.json({ items: [], hasMore: false });
  }

  // Get fan info for visible fans
  const { data: fans } = await admin
    .from("fans")
    .select("id, name, email")
    .in("id", visibleIds);

  const fanMap = new Map<string, { id: string; name: string; slug: string }>();
  for (const f of fans || []) {
    fanMap.set(f.id, {
      id: f.id,
      name: f.name || f.email?.split("@")[0] || "Fan",
      slug: generateFanSlug({ name: f.name, id: f.id }),
    });
  }

  // Calculate cutoff: 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();

  // Fetch collections from visible fans
  let collectionsQuery = admin
    .from("collections")
    .select(
      "id, fan_id, verified, created_at, performers!inner(id, name, slug, photo_url), venues(name)"
    )
    .in("fan_id", visibleIds)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(50);

  if (cursor) {
    collectionsQuery = collectionsQuery.lt("created_at", cursor);
  }

  const { data: collections } = await collectionsQuery;

  // Fetch badges from visible fans
  let badgesQuery = admin
    .from("fan_badges")
    .select("id, fan_id, badge_id, earned_at")
    .in("fan_id", visibleIds)
    .gte("earned_at", cutoff)
    .order("earned_at", { ascending: false })
    .limit(50);

  if (cursor) {
    badgesQuery = badgesQuery.lt("earned_at", cursor);
  }

  const { data: badgeRecords } = await badgesQuery;

  // Build activity items
  const items: ActivityFeedItem[] = [];

  for (const c of collections || []) {
    const fan = fanMap.get(c.fan_id);
    if (!fan) continue;

    const performer = c.performers as unknown as {
      id: string;
      name: string;
      slug: string;
      photo_url: string | null;
    };
    const venue = c.venues as unknown as { name: string } | null;

    const type: ActivityType = c.verified ? "collection" : "discovery";

    items.push({
      id: `col-${c.id}`,
      type,
      fan,
      performer: {
        id: performer.id,
        name: performer.name,
        slug: performer.slug,
        photo_url: performer.photo_url,
      },
      venue: venue ? { name: venue.name } : null,
      created_at: c.created_at,
    });
  }

  for (const b of badgeRecords || []) {
    const fan = fanMap.get(b.fan_id);
    if (!fan) continue;

    const def =
      BADGE_DEFINITIONS[b.badge_id as keyof typeof BADGE_DEFINITIONS];
    if (!def) continue;

    items.push({
      id: `badge-${b.id}`,
      type: "badge",
      fan,
      badge: {
        id: def.id,
        name: def.name,
        icon: def.icon,
        rarity: def.rarity,
      },
      created_at: b.earned_at,
    });
  }

  // Sort by timestamp descending
  items.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Limit to 50 and check if there are more
  const limited = items.slice(0, 50);
  const hasMore = items.length > 50;

  return NextResponse.json({ items: limited, hasMore });
}
