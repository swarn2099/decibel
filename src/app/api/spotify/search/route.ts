import { NextRequest, NextResponse } from "next/server";
import { searchSpotifyArtists } from "@/lib/spotify";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], existing: [] });
  }

  const admin = createSupabaseAdmin();

  // Monthly listeners threshold — filters out mainstream artists
  const MAX_FOLLOWERS = 1_000_000;

  // Search Decibel DB first (exclude mainstream artists with 1M+ followers)
  const { data: existingRaw } = await admin
    .from("performers")
    .select("id, name, slug, photo_url, genres, follower_count, spotify_url")
    .ilike("name", `%${q}%`)
    .or(`follower_count.lt.${MAX_FOLLOWERS},follower_count.is.null`)
    .order("follower_count", { ascending: false })
    .limit(5);

  const existing = existingRaw || [];

  // Search Spotify
  let spotifyResults: Awaited<ReturnType<typeof searchSpotifyArtists>> = [];
  let spotifyError: string | undefined;
  try {
    spotifyResults = await searchSpotifyArtists(q, 10);
  } catch (err) {
    spotifyError = err instanceof Error ? err.message : "Unknown Spotify error";
    console.error("Spotify search error:", spotifyError);
  }

  // Filter out Spotify results that already exist in Decibel (by spotify_url or exact name match)
  const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));
  const existingSpotifyUrls = new Set(
    existing.map((p) => p.spotify_url).filter(Boolean)
  );

  const filtered = spotifyResults.filter(
    (s) =>
      !existingNames.has(s.name.toLowerCase()) &&
      !existingSpotifyUrls.has(s.spotify_url) &&
      (s.followers ?? 0) < MAX_FOLLOWERS
  );

  return NextResponse.json({
    existing,
    results: filtered,
    ...(spotifyError && { spotify_error: spotifyError }),
  });
}
