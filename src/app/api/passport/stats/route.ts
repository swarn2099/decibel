import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import type { PassportStats } from "@/lib/types/passport";

interface CollectionPerformer {
  id: string;
  name: string;
  genres: string[];
  city: string;
}

interface CollectionVenue {
  id: string;
  name: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPerformer(c: any): CollectionPerformer {
  return c.performers as unknown as CollectionPerformer;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getVenue(c: any): CollectionVenue | null {
  return (c.venues as unknown as CollectionVenue) ?? null;
}

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();

  // Find fan
  const { data: fan } = await admin
    .from("fans")
    .select("id, created_at")
    .eq("email", user.email!)
    .single();

  if (!fan) {
    const emptyStats: PassportStats = {
      totalArtists: 0,
      totalDiscovered: 0,
      totalShows: 0,
      uniqueVenues: 0,
      uniqueCities: 0,
      favoriteGenre: null,
      mostCollectedArtist: null,
      mostVisitedVenue: null,
      currentStreak: 0,
      memberSince: new Date().toISOString(),
    };
    return NextResponse.json(emptyStats);
  }

  // Get all collections for this fan
  const { data: collections } = await admin
    .from("collections")
    .select(
      `id, verified, venue_id, event_date, created_at,
       performers!inner (id, name, genres, city),
       venues (id, name)`
    )
    .eq("fan_id", fan.id)
    .order("created_at", { ascending: false });

  const allCollections = collections || [];
  const verified = allCollections.filter((c) => c.verified);
  const discovered = allCollections.filter((c) => !c.verified);

  // Unique verified artists
  const verifiedPerformerIds = new Set(
    verified.map((c) => getPerformer(c).id)
  );
  const totalArtists = verifiedPerformerIds.size;

  // Unique discovered artists
  const discoveredPerformerIds = new Set(
    discovered.map((c) => getPerformer(c).id)
  );
  const totalDiscovered = discoveredPerformerIds.size;

  // Total verified shows
  const totalShows = verified.length;

  // Unique venues from verified
  const venueIds = new Set(
    verified
      .filter((c) => c.venue_id)
      .map((c) => c.venue_id)
  );
  const uniqueVenues = venueIds.size;

  // Unique cities from verified performers
  const cities = new Set(
    verified
      .map((c) => getPerformer(c).city)
      .filter(Boolean)
  );
  const uniqueCities = cities.size;

  // Favorite genre
  const genreCounts: Record<string, number> = {};
  verified.forEach((c) => {
    const genres = getPerformer(c).genres;
    if (genres) {
      genres.forEach((g: string) => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    }
  });
  const favoriteGenre =
    Object.keys(genreCounts).length > 0
      ? Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  // Most collected artist
  const artistCounts: Record<string, { name: string; count: number }> = {};
  verified.forEach((c) => {
    const p = getPerformer(c);
    if (!artistCounts[p.id]) {
      artistCounts[p.id] = { name: p.name, count: 0 };
    }
    artistCounts[p.id].count++;
  });
  const mostCollectedArtist =
    Object.values(artistCounts).length > 0
      ? Object.values(artistCounts).sort((a, b) => b.count - a.count)[0]
      : null;

  // Most visited venue
  const venueCounts: Record<string, { name: string; count: number }> = {};
  verified.forEach((c) => {
    const v = getVenue(c);
    if (v) {
      if (!venueCounts[v.id]) {
        venueCounts[v.id] = { name: v.name, count: 0 };
      }
      venueCounts[v.id].count++;
    }
  });
  const mostVisitedVenue =
    Object.values(venueCounts).length > 0
      ? Object.values(venueCounts).sort((a, b) => b.count - a.count)[0]
      : null;

  // Current streak: consecutive weeks with a verified scan
  let currentStreak = 0;
  if (verified.length > 0) {
    const now = new Date();
    const getWeekStart = (d: Date) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      return weekStart.getTime();
    };

    const scanWeeks = new Set(
      verified.map((c) => getWeekStart(new Date(c.created_at)))
    );

    let weekStart = getWeekStart(now);
    // Check if current week has a scan, if not start from previous
    if (!scanWeeks.has(weekStart)) {
      weekStart -= 7 * 24 * 60 * 60 * 1000;
    }

    while (scanWeeks.has(weekStart)) {
      currentStreak++;
      weekStart -= 7 * 24 * 60 * 60 * 1000;
    }
  }

  const stats: PassportStats = {
    totalArtists,
    totalDiscovered,
    totalShows,
    uniqueVenues,
    uniqueCities,
    favoriteGenre,
    mostCollectedArtist,
    mostVisitedVenue,
    currentStreak,
    memberSince: fan.created_at,
  };

  return NextResponse.json(stats);
}
