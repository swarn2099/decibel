import { NextRequest, NextResponse } from "next/server";
import { searchSpotifyArtists } from "@/lib/spotify";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";

async function getUserEmail(req: NextRequest, admin: ReturnType<typeof createSupabaseAdmin>): Promise<string | null> {
  // Try Bearer token first (mobile)
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const { data, error } = await admin.auth.getUser(token);
    if (!error && data.user?.email) return data.user.email;
  }

  // Fall back to cookie auth (web)
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) return user.email;
  } catch {}

  return null;
}

async function getUserSpotifyToken(req: NextRequest, admin: ReturnType<typeof createSupabaseAdmin>): Promise<string | null> {
  try {
    const email = await getUserEmail(req, admin);
    if (!email) return null;

    const { data: fan } = await admin
      .from("fans")
      .select("spotify_refresh_token")
      .eq("email", email)
      .maybeSingle();

    if (!fan?.spotify_refresh_token) return null;

    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: fan.spotify_refresh_token,
      }),
    });

    if (!res.ok) {
      console.error("[spotify/search] User refresh token failed:", res.status);
      return null;
    }

    const data = await res.json();

    // Save rotated refresh token if provided
    if (data.refresh_token && data.refresh_token !== fan.spotify_refresh_token) {
      await admin
        .from("fans")
        .update({ spotify_refresh_token: data.refresh_token })
        .eq("email", email);
    }

    return data.access_token;
  } catch {
    return null;
  }
}

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

  // Try user's own Spotify token first, then fall back to server token
  const userToken = await getUserSpotifyToken(req, admin);

  // Search Spotify
  let spotifyResults: Awaited<ReturnType<typeof searchSpotifyArtists>> = [];
  let spotifyError: string | undefined;
  try {
    spotifyResults = await searchSpotifyArtists(q, 10, userToken || undefined);
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
