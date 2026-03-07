import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

const MAINSTREAM_FOLLOWER_THRESHOLD = 1_000_000;

interface SpotifyArtist {
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  followers: { total: number };
  external_urls: { spotify: string };
}

interface ImportedArtist {
  name: string;
  performer_id: string;
  photo_url: string | null;
  already_discovered: boolean;
  has_upcoming_show: boolean;
  next_show?: { venue_name: string; event_date: string };
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 6);
}

export async function POST() {
  try {
    // Auth check
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Get Spotify token from cookie, or refresh from stored token
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    let spotifyToken = cookieStore.get("spotify_token")?.value;

    if (!spotifyToken) {
      console.log("[spotify/import] No cookie token, trying stored refresh token for", user.email);
      // Try to get a fresh token from the user's stored refresh token
      const { data: fanWithToken } = await supabaseAdmin
        .from("fans")
        .select("spotify_refresh_token")
        .eq("email", user.email)
        .maybeSingle();

      if (!fanWithToken?.spotify_refresh_token) {
        console.error("[spotify/import] No refresh token stored for", user.email);
        return NextResponse.json(
          { error: "Spotify not connected" },
          { status: 401 }
        );
      }

      const clientId = process.env.SPOTIFY_CLIENT_ID!;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
      const refreshRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: fanWithToken.spotify_refresh_token,
        }),
      });

      if (!refreshRes.ok) {
        const errBody = await refreshRes.text();
        console.error("[spotify/import] Refresh token failed:", refreshRes.status, errBody);
        // Refresh token revoked — clear it
        await supabaseAdmin
          .from("fans")
          .update({ spotify_refresh_token: null, spotify_connected_at: null })
          .eq("email", user.email);
        return NextResponse.json(
          { error: "Spotify session expired. Please reconnect." },
          { status: 401 }
        );
      }

      const refreshData = await refreshRes.json();
      spotifyToken = refreshData.access_token;

      // If Spotify rotated the refresh token, save the new one
      if (refreshData.refresh_token) {
        await supabaseAdmin
          .from("fans")
          .update({ spotify_refresh_token: refreshData.refresh_token })
          .eq("email", user.email);
      }
    }

    // Fetch top artists from Spotify
    const spotifyRes = await fetch(
      "https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term",
      {
        headers: { Authorization: `Bearer ${spotifyToken}` },
      }
    );

    if (!spotifyRes.ok) {
      const errBody = await spotifyRes.text();
      console.error("[spotify/import] Spotify top artists failed:", spotifyRes.status, errBody);
      const isDevMode = errBody.includes("not registered");
      return NextResponse.json(
        { error: isDevMode
            ? "Spotify app is in Development Mode. Add your account as a test user in the Spotify Developer Dashboard."
            : `Spotify API error (${spotifyRes.status}): ${errBody.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const spotifyData = await spotifyRes.json();
    const spotifyArtists: SpotifyArtist[] = spotifyData.items || [];

    // Get or create fan
    const { data: fan } = await supabaseAdmin
      .from("fans")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    let fanId: string;
    if (fan) {
      fanId = fan.id;
    } else {
      const { data: newFan, error: fanErr } = await supabaseAdmin
        .from("fans")
        .upsert({ email: user.email }, { onConflict: "email" })
        .select("id")
        .single();
      if (fanErr || !newFan) {
        return NextResponse.json(
          { error: "Failed to create fan record" },
          { status: 500 }
        );
      }
      fanId = newFan.id;
    }

    const today = new Date().toISOString().split("T")[0];
    const importedArtists: ImportedArtist[] = [];
    let alreadyHadCount = 0;

    let skippedMainstream = 0;

    for (const artist of spotifyArtists) {
      // Skip mainstream artists (1M+ followers)
      if (artist.followers?.total >= MAINSTREAM_FOLLOWER_THRESHOLD) {
        console.log(`[spotify/import] Skipping mainstream artist: ${artist.name} (${(artist.followers.total / 1_000_000).toFixed(1)}M followers)`);
        skippedMainstream++;
        continue;
      }

      const photoUrl = artist.images?.[0]?.url || null;

      // Check if performer exists by name (case-insensitive)
      const { data: existingPerformer } = await supabaseAdmin
        .from("performers")
        .select("id, name, slug, photo_url")
        .ilike("name", artist.name)
        .maybeSingle();

      let performerId: string;
      let performerPhotoUrl: string | null;

      if (existingPerformer) {
        performerId = existingPerformer.id;
        performerPhotoUrl = existingPerformer.photo_url;

        // Backfill follower_count if missing
        if (artist.followers?.total && artist.followers.total > 0) {
          await supabaseAdmin
            .from("performers")
            .update({ follower_count: artist.followers.total })
            .eq("id", performerId)
            .eq("follower_count", 0);
        }
      } else {
        // Create new performer
        let slug = generateSlug(artist.name);
        const { data: slugCheck } = await supabaseAdmin
          .from("performers")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (slugCheck) {
          slug = `${slug}-${randomSuffix()}`;
        }

        const { data: newPerformer, error: performerErr } = await supabaseAdmin
          .from("performers")
          .insert({
            name: artist.name,
            slug,
            photo_url: photoUrl,
            genres: artist.genres || [],
            follower_count: artist.followers?.total || 0,
            claimed: false,
          })
          .select("id, photo_url")
          .single();

        if (performerErr || !newPerformer) {
          continue; // Skip this artist on error
        }
        performerId = newPerformer.id;
        performerPhotoUrl = newPerformer.photo_url;
      }

      // Insert collection (skip if already exists)
      const { error: collectionError } = await supabaseAdmin
        .from("collections")
        .insert({
          fan_id: fanId,
          performer_id: performerId,
          capture_method: "online",
          verified: false,
        });

      const alreadyDiscovered = collectionError?.code === "23505";
      if (alreadyDiscovered) alreadyHadCount++;

      // Check for upcoming events
      const { data: upcomingEvent } = await supabaseAdmin
        .from("events")
        .select("event_date, venues(name)")
        .eq("performer_id", performerId)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      const hasUpcomingShow = !!upcomingEvent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const venueName = (upcomingEvent as any)?.venues?.name;

      importedArtists.push({
        name: artist.name,
        performer_id: performerId,
        photo_url: performerPhotoUrl || photoUrl,
        already_discovered: alreadyDiscovered,
        has_upcoming_show: hasUpcomingShow,
        next_show: hasUpcomingShow
          ? {
              venue_name: venueName || "TBA",
              event_date: upcomingEvent!.event_date,
            }
          : undefined,
      });
    }

    // Delete the spotify_token cookie (one-time use)
    const response = NextResponse.json({
      imported: importedArtists.length - alreadyHadCount,
      already_had: alreadyHadCount,
      skipped_mainstream: skippedMainstream,
      artists: importedArtists,
    });
    response.cookies.set("spotify_token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[spotify/import] Unexpected error:", err);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 }
    );
  }
}
