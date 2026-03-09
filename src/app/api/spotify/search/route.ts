import { NextRequest, NextResponse } from "next/server";
import { searchDeezerArtists } from "@/lib/deezer";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_FANS = 13_000;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], existing: [] });
  }

  const admin = createSupabaseAdmin();

  // Search Decibel DB first (exclude mainstream artists with 1M+ followers)
  const { data: existingRaw } = await admin
    .from("performers")
    .select("id, name, slug, photo_url, genres, follower_count, spotify_url")
    .ilike("name", `%${q}%`)
    .or(`follower_count.lt.${MAX_FANS},follower_count.is.null`)
    .order("follower_count", { ascending: false })
    .limit(5);

  const existing = existingRaw || [];

  // Search Deezer (free, no auth, returns fan counts)
  let deezerResults: Awaited<ReturnType<typeof searchDeezerArtists>> = [];
  let spotifyError: string | undefined;
  try {
    deezerResults = await searchDeezerArtists(q, 15);
  } catch (err) {
    spotifyError = err instanceof Error ? err.message : "Search unavailable";
    console.error("Deezer search error:", spotifyError);
  }

  // Filter: remove artists already in Decibel and those over 1M fans
  const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));

  const filtered = deezerResults
    .filter(
      (a) => !existingNames.has(a.name.toLowerCase()) && a.fans < MAX_FANS
    )
    .map((a) => ({
      id: a.id,
      name: a.name,
      photo_url: a.photo_url,
      spotify_url: a.deezer_url,
      genres: [] as string[],
      followers: a.fans,
      monthly_listeners: null as number | null,
    }));

  return NextResponse.json({
    existing,
    results: filtered,
    ...(spotifyError && { spotify_error: spotifyError }),
  });
}
