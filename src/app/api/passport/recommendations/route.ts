import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

interface RecommendedPerformer {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[];
  city: string | null;
  match_reason: string;
  next_show: { venue_name: string; event_date: string } | null;
}

interface RecommendationsResponse {
  recommendations: RecommendedPerformer[];
  based_on_genres: string[];
}

export async function GET() {
  try {
    // Auth check
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { recommendations: [], based_on_genres: [] } satisfies RecommendationsResponse,
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get fan
    const { data: fan } = await supabase
      .from("fans")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!fan) {
      return NextResponse.json({
        recommendations: [],
        based_on_genres: [],
      } satisfies RecommendationsResponse);
    }

    // Get fan's collected performer IDs
    const { data: collections } = await supabase
      .from("collections")
      .select("performer_id")
      .eq("fan_id", fan.id);

    if (!collections || collections.length === 0) {
      return NextResponse.json({
        recommendations: [],
        based_on_genres: [],
      } satisfies RecommendationsResponse);
    }

    const collectedIds = collections.map((c) => c.performer_id);

    // Get genres from collected performers
    const { data: collectedPerformers } = await supabase
      .from("performers")
      .select("genres")
      .in("id", collectedIds);

    // Build genre frequency map
    const genreFreq = new Map<string, number>();
    for (const p of collectedPerformers || []) {
      if (p.genres && Array.isArray(p.genres)) {
        for (const g of p.genres) {
          genreFreq.set(g, (genreFreq.get(g) || 0) + 1);
        }
      }
    }

    // Get top genres
    const topGenres = Array.from(genreFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    let performers: Array<{
      id: string;
      name: string;
      slug: string;
      photo_url: string | null;
      genres: string[];
      city: string | null;
      follower_count: number | null;
    }> = [];

    if (topGenres.length > 0) {
      // Query performers with overlapping genres, excluding collected
      const { data } = await supabase
        .from("performers")
        .select("id, name, slug, photo_url, genres, city, follower_count")
        .overlaps("genres", topGenres)
        .not("id", "in", `(${collectedIds.join(",")})`)
        .order("follower_count", { ascending: false, nullsFirst: false })
        .limit(30);

      performers = data || [];
    }

    // Fallback: if no genre overlap, get popular performers
    if (performers.length === 0) {
      const { data } = await supabase
        .from("performers")
        .select("id, name, slug, photo_url, genres, city, follower_count")
        .not("id", "in", `(${collectedIds.join(",")})`)
        .order("follower_count", { ascending: false, nullsFirst: false })
        .limit(30);

      performers = data || [];
    }

    if (performers.length === 0) {
      return NextResponse.json({
        recommendations: [],
        based_on_genres: topGenres,
      } satisfies RecommendationsResponse);
    }

    const today = new Date().toISOString().split("T")[0];

    // Get upcoming events for these performers
    const performerIds = performers.map((p) => p.id);
    const { data: upcomingEvents } = await supabase
      .from("events")
      .select("performer_id, event_date, venues(name)")
      .in("performer_id", performerIds)
      .gte("event_date", today)
      .order("event_date", { ascending: true });

    // Build a map of performer_id -> next show
    const nextShowMap = new Map<
      string,
      { venue_name: string; event_date: string }
    >();
    for (const event of upcomingEvents || []) {
      if (!nextShowMap.has(event.performer_id)) {
        const venue = event.venues as unknown as { name: string } | null;
        nextShowMap.set(event.performer_id, {
          venue_name: venue?.name || "TBA",
          event_date: event.event_date,
        });
      }
    }

    // Sort: performers with upcoming events first, then by follower_count
    performers.sort((a, b) => {
      const aHasShow = nextShowMap.has(a.id) ? 1 : 0;
      const bHasShow = nextShowMap.has(b.id) ? 1 : 0;
      if (aHasShow !== bHasShow) return bHasShow - aHasShow;
      return (b.follower_count || 0) - (a.follower_count || 0);
    });

    // Take top 10
    const top10 = performers.slice(0, 10);

    // Build match_reason for each
    const recommendations: RecommendedPerformer[] = top10.map((p) => {
      const matchingGenres = (p.genres || []).filter((g: string) =>
        topGenres.includes(g)
      );
      let matchReason: string;
      if (matchingGenres.length > 0) {
        const genreStr = matchingGenres.slice(0, 2).join(" & ");
        matchReason = `Based on your love for ${genreStr}`;
      } else {
        matchReason = "Popular in your area";
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        photo_url: p.photo_url,
        genres: (p.genres || []).slice(0, 3),
        city: p.city,
        match_reason: matchReason,
        next_show: nextShowMap.get(p.id) || null,
      };
    });

    return NextResponse.json({
      recommendations,
      based_on_genres: topGenres,
    } satisfies RecommendationsResponse);
  } catch {
    return NextResponse.json(
      { recommendations: [], based_on_genres: [] } satisfies RecommendationsResponse,
      { status: 500 }
    );
  }
}
