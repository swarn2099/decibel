import { createSupabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import type { MapVenue, MapEvent } from "@/lib/types/map";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { searchParams } = request.nextUrl;

  const genre = searchParams.get("genre");
  const tonight = searchParams.get("tonight");

  const today = new Date().toISOString().split("T")[0];

  // Build query: venues with upcoming events + performer info
  let query = supabase
    .from("venues")
    .select(
      `
      id, name, slug, latitude, longitude,
      events!inner(
        id, event_date, start_time, external_url,
        performer:performers(name, slug, photo_url, genres)
      )
    `
    )
    .gte("events.event_date", today);

  // Filter to tonight only
  if (tonight === "true") {
    query = query.eq("events.event_date", today);
  }

  const { data: venues, error } = await query;

  if (error) {
    console.error("Map API error:", error);
    return NextResponse.json({ error: "Failed to fetch map data" }, { status: 500 });
  }

  if (!venues || venues.length === 0) {
    return NextResponse.json({ venues: [] });
  }

  // Transform into MapVenue[] format
  const mapVenues: MapVenue[] = [];

  for (const venue of venues) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (venue.events || []) as any[];

    // Collect genres and build event list
    const genreSet = new Set<string>();
    const upcomingEvents: MapEvent[] = [];

    for (const event of events) {
      // Supabase returns performer as object (single FK) or array — normalize
      const performer = Array.isArray(event.performer)
        ? event.performer[0]
        : event.performer;
      if (!performer) continue;

      // Collect genres from performer
      if (performer.genres && Array.isArray(performer.genres)) {
        for (const g of performer.genres) {
          genreSet.add(g);
        }
      }

      upcomingEvents.push({
        id: event.id,
        event_date: event.event_date,
        start_time: event.start_time,
        external_url: event.external_url,
        performer_name: performer.name,
        performer_slug: performer.slug,
        performer_photo: performer.photo_url,
      });
    }

    // Sort by event_date ascending
    upcomingEvents.sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

    // Apply genre filter: skip venues with no matching genre
    if (genre) {
      const lowerGenre = genre.toLowerCase();
      const hasGenre = Array.from(genreSet).some(
        (g) => g.toLowerCase() === lowerGenre
      );
      if (!hasGenre) continue;
    }

    // Skip venues with no valid events (all performers null)
    if (upcomingEvents.length === 0) continue;

    mapVenues.push({
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      latitude: venue.latitude,
      longitude: venue.longitude,
      event_count: upcomingEvents.length,
      genres: Array.from(genreSet).sort(),
      upcoming_events: upcomingEvents,
    });
  }

  return NextResponse.json({ venues: mapVenues });
}
