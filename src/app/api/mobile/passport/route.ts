import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify Supabase JWT and return user email
async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

// Calculate tier from scan count
function calculateTier(scanCount: number): string {
  if (scanCount >= 10) return "inner_circle";
  if (scanCount >= 5) return "secret";
  if (scanCount >= 3) return "early_access";
  return "network";
}

// Seeded rotation from collection id
function getSeededRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 7) - 3;
}

export async function GET(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0");
  const pageSize = 20;
  // Optional filter: ?collection_type=stamp|find|discovery (for View More pages)
  const collectionTypeFilter = req.nextUrl.searchParams.get("collection_type") as "stamp" | "find" | "discovery" | null;

  // Support viewing another user's passport via fan_id param
  const targetFanId = req.nextUrl.searchParams.get("fan_id");

  // Get the authenticated user's fan record
  let { data: authFan } = await admin
    .from("fans")
    .select("id, name, avatar_url, city, created_at, spotify_connected_at")
    .eq("email", email)
    .single();

  if (!authFan) {
    // Auto-create fan record on first mobile login
    const { data: newFan, error: createError } = await admin
      .from("fans")
      .insert({ email, name: null, city: null })
      .select("id, name, avatar_url, city, created_at, spotify_connected_at")
      .single();

    if (createError) {
      return NextResponse.json(
        { error: "Failed to create fan profile" },
        { status: 500 }
      );
    }
    authFan = newFan;
  }

  // If viewing another user's passport, load their fan record
  let fan = authFan;
  let isOwnPassport = true;
  if (targetFanId && targetFanId !== authFan.id) {
    const { data: targetFan } = await admin
      .from("fans")
      .select("id, name, avatar_url, city, created_at, spotify_connected_at")
      .eq("id", targetFanId)
      .single();

    if (!targetFan) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    fan = targetFan;
    isOwnPassport = false;
  }

  // Check if current user follows the target (for profile pages)
  let isFollowing = false;
  if (!isOwnPassport) {
    const { data: followRow } = await admin
      .from("fan_follows")
      .select("id")
      .eq("follower_id", authFan.id)
      .eq("following_id", fan.id)
      .maybeSingle();
    isFollowing = !!followRow;
  }

  // Get collections (paginated)
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let collectionsQuery = admin
    .from("collections")
    .select(
      `id, verified, capture_method, event_date, created_at, collection_type,
       performers!inner (id, name, slug, photo_url, genres, city, spotify_url, soundcloud_url, mixcloud_url),
       venues (name),
       fans!collections_fan_id_fkey (id, name)`
    )
    .eq("fan_id", fan.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (collectionTypeFilter) {
    collectionsQuery = collectionsQuery.eq("collection_type", collectionTypeFilter);
  }

  const { data: collections, error: collectionsError } = await collectionsQuery;

  if (collectionsError) {
    console.error("[passport] Collections query error:", collectionsError.message, collectionsError.details);
  }

  // Build fan_count map for all performers on this page
  const performerIds = (collections ?? []).map((c: Record<string, unknown>) => {
    const p = Array.isArray(c.performers) ? c.performers[0] : c.performers;
    return (p as Record<string, unknown>)?.id as string;
  }).filter(Boolean);

  const { data: fanCountRows } = await admin
    .from("collections")
    .select("performer_id")
    .in("performer_id", performerIds);

  const fanCountMap = new Map<string, number>();
  for (const row of fanCountRows ?? []) {
    fanCountMap.set(row.performer_id, (fanCountMap.get(row.performer_id) ?? 0) + 1);
  }

  // Get fan_tiers and founder_badges for this fan
  const [{ data: tiers }, { data: founderBadges }] = await Promise.all([
    admin
      .from("fan_tiers")
      .select("performer_id, scan_count, current_tier")
      .eq("fan_id", fan.id),
    admin
      .from("founder_badges")
      .select("performer_id, created_at")
      .eq("fan_id", fan.id),
  ]);

  const foundedPerformerIds = new Set(
    (founderBadges ?? []).map((f: { performer_id: string }) => f.performer_id)
  );

  const tierMap = new Map(
    (tiers ?? []).map((t: Record<string, unknown>) => [
      t.performer_id as string,
      {
        scan_count: t.scan_count as number,
        current_tier: t.current_tier as string,
      },
    ])
  );

  // Map collections to stamps
  const stamps = (collections ?? []).map((c: Record<string, unknown>) => {
    const performer = Array.isArray(c.performers)
      ? c.performers[0]
      : c.performers;
    const venue = Array.isArray(c.venues) ? c.venues[0] : c.venues;
    const fanRecord = Array.isArray(c.fans) ? c.fans[0] : c.fans;
    const performerId = (performer as Record<string, unknown>)?.id as string;
    const tier = tierMap.get(performerId);
    const isFounder = foundedPerformerIds.has(performerId);

    const p = performer as Record<string, unknown>;
    const platformUrl =
      (p.spotify_url as string | null) ??
      (p.soundcloud_url as string | null) ??
      (p.mixcloud_url as string | null) ??
      null;

    // Derive collection_type from DB value, falling back to legacy inference
    let collectionType = (c.collection_type as string | null);
    if (!collectionType) {
      if (c.verified === true) collectionType = "stamp";
      else if (isFounder) collectionType = "find";
      else collectionType = "discovery";
    }

    return {
      id: c.id,
      performer: {
        id: performerId,
        name: (p?.name as string) ?? "Unknown",
        slug: (p?.slug as string) ?? "",
        photo_url: (p?.photo_url as string) ?? null,
        genres: (p?.genres as string[]) ?? [],
        city: (p?.city as string) ?? "",
        platform_url: platformUrl,
      },
      venue: venue
        ? { name: (venue as Record<string, unknown>).name as string }
        : null,
      event_date: c.event_date ?? null,
      capture_method: c.capture_method,
      verified: c.verified,
      created_at: c.created_at,
      scan_count: tier?.scan_count ?? null,
      current_tier: tier?.current_tier ?? null,
      is_founder: isFounder,
      rotation: getSeededRotation(c.id as string),
      fan_count: fanCountMap.get(performerId) ?? 0,
      collection_type: collectionType,
      finder_username: (fanRecord as Record<string, unknown> | null)?.name as string | null ?? null,
      finder_fan_id: (fanRecord as Record<string, unknown> | null)?.id as string | null ?? null,
    };
  });

  // Add founder-only artists that have no collection entry (page 0 only)
  if (page === 0) {
    const collectionPerformerIds = new Set(stamps.map((s: { performer: { id: string } }) => s.performer.id));
    const founderOnlyIds = (founderBadges ?? [])
      .filter((f: { performer_id: string }) => !collectionPerformerIds.has(f.performer_id))
      .map((f: { performer_id: string; created_at: string }) => f);

    if (founderOnlyIds.length > 0) {
      const { data: founderPerformers } = await admin
        .from("performers")
        .select("id, name, slug, photo_url, genres, city, spotify_url, soundcloud_url, mixcloud_url")
        .in("id", founderOnlyIds.map((f: { performer_id: string }) => f.performer_id));

      for (const fp of founderPerformers ?? []) {
        const founderBadge = founderOnlyIds.find((f: { performer_id: string }) => f.performer_id === fp.id);
        const platformUrl = fp.spotify_url ?? fp.soundcloud_url ?? fp.mixcloud_url ?? null;
        stamps.push({
          id: `founder-${fp.id}`,
          performer: {
            id: fp.id,
            name: fp.name ?? "Unknown",
            slug: fp.slug ?? "",
            photo_url: fp.photo_url ?? null,
            genres: fp.genres ?? [],
            city: fp.city ?? "",
            platform_url: platformUrl,
          },
          venue: null,
          event_date: null,
          capture_method: "online",
          verified: false,
          created_at: founderBadge?.created_at ?? new Date().toISOString(),
          scan_count: null,
          current_tier: null,
          is_founder: true,
          rotation: getSeededRotation(fp.id),
          fan_count: fanCountMap.get(fp.id) ?? 0,
          collection_type: "find",
          finder_username: fan.name ?? null,
          finder_fan_id: fan.id,
        });
      }
    }
  }

  // Compute stats (only on page 0 to avoid redundant work)
  let stats = null;
  if (page === 0) {
    // Get ALL collections for stats (not paginated)
    const { data: allCollections } = await admin
      .from("collections")
      .select(
        `id, verified, capture_method, created_at,
         performers!inner (id, name, genres, city),
         venues (id, name)`
      )
      .eq("fan_id", fan.id);

    const rows = (allCollections ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      performer: Array.isArray(c.performers)
        ? c.performers[0]
        : c.performers,
      venue: Array.isArray(c.venues) ? c.venues[0] : c.venues,
    })) as Array<Record<string, unknown> & { performer: Record<string, unknown>; venue: Record<string, unknown> | null }>;

    const verified = rows.filter((r) => r.verified === true);
    const discovered = rows.filter((r) => r.verified === false);

    // Unique performers
    const verifiedPerformerIds = new Set(
      verified.map(
        (r) => (r.performer as Record<string, unknown>)?.id as string
      )
    );

    // Unique venues + cities
    const venueIds = new Set<string>();
    const cities = new Set<string>();
    for (const r of verified) {
      const venue = r.venue as Record<string, unknown> | null;
      if (venue?.id) venueIds.add(venue.id as string);
      const perf = r.performer as Record<string, unknown> | null;
      if (perf?.city) cities.add(perf.city as string);
    }

    // Favorite genre
    const genreCounts: Record<string, number> = {};
    for (const r of rows) {
      const perf = r.performer as Record<string, unknown> | null;
      const genres = perf?.genres as string[] | null;
      if (genres) {
        for (const g of genres) {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        }
      }
    }
    const favoriteGenre =
      Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Most collected artist
    const artistCounts: Record<string, { name: string; count: number }> = {};
    for (const r of verified) {
      const perf = r.performer as Record<string, unknown> | null;
      if (perf?.id) {
        const pid = perf.id as string;
        if (!artistCounts[pid]) {
          artistCounts[pid] = { name: perf.name as string, count: 0 };
        }
        artistCounts[pid].count++;
      }
    }
    const mostCollected =
      Object.values(artistCounts).sort((a, b) => b.count - a.count)[0] ?? null;

    // Streak
    let streak = 0;
    if (verified.length > 0) {
      const now = new Date();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const weeks = new Set(
        verified.map((r) => {
          const d = new Date(r.created_at as string);
          const startOfWeek = new Date(d);
          startOfWeek.setDate(d.getDate() - d.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return startOfWeek.getTime();
        })
      );
      const sortedWeeks = Array.from(weeks).sort((a, b) => b - a);
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - now.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);
      let checkWeek = currentWeekStart.getTime();
      for (const weekStart of sortedWeeks) {
        if (weekStart === checkWeek || weekStart === checkWeek - weekMs) {
          streak++;
          checkWeek = weekStart - weekMs;
        } else if (weekStart < checkWeek) {
          break;
        }
      }
    }

    // Include founder-only artists in stats
    const founderOnlyCount = (founderBadges ?? []).filter(
      (f: { performer_id: string }) => !rows.some((r) => (r.performer as Record<string, unknown>)?.id === f.performer_id)
    ).length;

    stats = {
      totalArtists: verifiedPerformerIds.size,
      totalDiscovered: discovered.length + founderOnlyCount,
      totalShows: verified.length,
      uniqueVenues: venueIds.size,
      uniqueCities: cities.size,
      favoriteGenre,
      mostCollectedArtist: mostCollected,
      mostVisitedVenue: null,
      currentStreak: streak,
      memberSince: fan.created_at,
    };
  }

  // Badges + social counts (only on page 0)
  let badges = null;
  let social = null;
  if (page === 0) {
    // Get earned badges
    const { data: earnedBadges } = await admin
      .from("fan_badges")
      .select("badge_id, earned_at")
      .eq("fan_id", fan.id);

    // Get badge holder counts for rarity
    const [{ count: totalFans }, { data: allBadgeCounts }] = await Promise.all([
      admin.from("fans").select("id", { count: "exact", head: true }),
      admin.from("fan_badges").select("badge_id"),
    ]);

    const badgeHolderCounts = new Map<string, number>();
    for (const row of allBadgeCounts ?? []) {
      badgeHolderCounts.set(row.badge_id, (badgeHolderCounts.get(row.badge_id) ?? 0) + 1);
    }

    badges = {
      earned: (earnedBadges ?? []).map((b: { badge_id: string; earned_at: string }) => ({
        badge_id: b.badge_id,
        earned_at: b.earned_at,
      })),
      totalFans: totalFans ?? 0,
      holderCounts: Object.fromEntries(badgeHolderCounts),
    };

    // Social counts
    const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
      admin.from("fan_follows").select("id", { count: "exact", head: true }).eq("following_id", fan.id),
      admin.from("fan_follows").select("id", { count: "exact", head: true }).eq("follower_id", fan.id),
    ]);

    social = {
      followers: followerCount ?? 0,
      following: followingCount ?? 0,
    };
  }

  return NextResponse.json({
    fan: {
      id: fan.id,
      name: fan.name,
      avatar_url: fan.avatar_url,
      city: fan.city,
      created_at: fan.created_at,
      spotify_connected_at: fan.spotify_connected_at ?? null,
    },
    collections: stamps,
    stats,
    is_following: isFollowing,
    badges,
    social,
    hasMore: stamps.length === pageSize,
  });
}
