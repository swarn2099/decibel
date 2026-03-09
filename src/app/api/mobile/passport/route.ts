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

  // Get fan record (auto-create if missing)
  let { data: fan } = await admin
    .from("fans")
    .select("id, name, avatar_url, city, created_at, spotify_connected_at")
    .eq("email", email)
    .single();

  if (!fan) {
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
    fan = newFan;
  }

  // Get collections (paginated)
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data: collections } = await admin
    .from("collections")
    .select(
      `id, verified, capture_method, event_date, created_at,
       performers!inner (id, name, slug, photo_url, genres, city),
       venues (name)`
    )
    .eq("fan_id", fan.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  // Get fan_tiers and founder_badges for this fan
  const [{ data: tiers }, { data: founderBadges }] = await Promise.all([
    admin
      .from("fan_tiers")
      .select("performer_id, scan_count, current_tier")
      .eq("fan_id", fan.id),
    admin
      .from("founder_badges")
      .select("performer_id")
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
    const performerId = (performer as Record<string, unknown>)?.id as string;
    const tier = tierMap.get(performerId);

    return {
      id: c.id,
      performer: {
        id: performerId,
        name:
          ((performer as Record<string, unknown>)?.name as string) ?? "Unknown",
        slug:
          ((performer as Record<string, unknown>)?.slug as string) ?? "",
        photo_url:
          ((performer as Record<string, unknown>)?.photo_url as string) ?? null,
        genres:
          ((performer as Record<string, unknown>)?.genres as string[]) ?? [],
        city:
          ((performer as Record<string, unknown>)?.city as string) ?? "",
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
      is_founder: foundedPerformerIds.has(performerId),
      rotation: getSeededRotation(c.id as string),
    };
  });

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

    stats = {
      totalArtists: verifiedPerformerIds.size,
      totalDiscovered: discovered.length,
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
    badges,
    social,
    hasMore: stamps.length === pageSize,
  });
}
