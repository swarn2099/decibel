import { NextRequest, NextResponse } from "next/server";
import { searchSpotifyArtists } from "@/lib/spotify";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], existing: [] });
  }

  const admin = createSupabaseAdmin();

  // Search Decibel DB first
  const { data: existing } = await admin
    .from("performers")
    .select("id, name, slug, photo_url, genres, follower_count, spotify_url")
    .ilike("name", `%${q}%`)
    .order("follower_count", { ascending: false })
    .limit(5);

  // Search Spotify
  let spotifyResults: Awaited<ReturnType<typeof searchSpotifyArtists>> = [];
  try {
    spotifyResults = await searchSpotifyArtists(q, 5);
  } catch {
    // Spotify may not be configured yet — return DB results only
  }

  // Filter out Spotify results that already exist in Decibel (by spotify_url or exact name match)
  const existingNames = new Set((existing || []).map((p) => p.name.toLowerCase()));
  const existingSpotifyUrls = new Set(
    (existing || []).map((p) => p.spotify_url).filter(Boolean)
  );

  const filtered = spotifyResults.filter(
    (s) =>
      !existingNames.has(s.name.toLowerCase()) &&
      !existingSpotifyUrls.has(s.spotify_url)
  );

  return NextResponse.json({
    existing: existing || [],
    results: filtered,
  });
}
