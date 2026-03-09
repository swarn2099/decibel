import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAINSTREAM_FOLLOWER_THRESHOLD = 1_000_000;

interface SpotifyArtist {
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  followers: { total: number };
  external_urls: { spotify: string };
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

// Verify Supabase JWT and return user email
async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

export async function POST(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const spotifyAccessToken = body.spotify_access_token;
  const spotifyRefreshToken = body.spotify_refresh_token ?? null;

  if (!spotifyAccessToken) {
    return NextResponse.json(
      { error: "Missing spotify_access_token" },
      { status: 400 }
    );
  }

  try {
    // Fetch top artists from Spotify
    const spotifyRes = await fetch(
      "https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term",
      { headers: { Authorization: `Bearer ${spotifyAccessToken}` } }
    );

    if (!spotifyRes.ok) {
      const errBody = await spotifyRes.text();
      const isDevMode = errBody.includes("not registered");
      return NextResponse.json(
        {
          error: isDevMode
            ? "Add your Spotify account as a test user in the Developer Dashboard."
            : `Spotify API error (${spotifyRes.status})`,
        },
        { status: 502 }
      );
    }

    const spotifyData = await spotifyRes.json();
    const spotifyArtists: SpotifyArtist[] = spotifyData.items || [];

    // Get or create fan
    let { data: fan } = await admin
      .from("fans")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!fan) {
      const { data: newFan, error: fanErr } = await admin
        .from("fans")
        .upsert({ email }, { onConflict: "email" })
        .select("id")
        .single();
      if (fanErr || !newFan) {
        return NextResponse.json(
          { error: "Failed to create fan record" },
          { status: 500 }
        );
      }
      fan = newFan;
    }

    // Always mark Spotify as connected; store refresh token if available
    const spotifyUpdate: Record<string, string> = {
      spotify_connected_at: new Date().toISOString(),
    };
    if (spotifyRefreshToken) {
      spotifyUpdate.spotify_refresh_token = spotifyRefreshToken;
    }
    await admin.from("fans").update(spotifyUpdate).eq("id", fan.id);

    const today = new Date().toISOString().split("T")[0];
    const importedArtists: {
      name: string;
      performer_id: string;
      photo_url: string | null;
      already_discovered: boolean;
      has_upcoming_show: boolean;
      next_show?: { venue_name: string; event_date: string };
    }[] = [];
    let alreadyHadCount = 0;
    let skippedMainstream = 0;

    for (const artist of spotifyArtists) {
      if (artist.followers?.total >= MAINSTREAM_FOLLOWER_THRESHOLD) {
        skippedMainstream++;
        continue;
      }

      const photoUrl = artist.images?.[0]?.url || null;

      // Check if performer exists
      const { data: existingPerformer } = await admin
        .from("performers")
        .select("id, name, slug, photo_url")
        .ilike("name", artist.name)
        .maybeSingle();

      let performerId: string;
      let performerPhotoUrl: string | null;

      if (existingPerformer) {
        performerId = existingPerformer.id;
        performerPhotoUrl = existingPerformer.photo_url;

        if (artist.followers?.total && artist.followers.total > 0) {
          await admin
            .from("performers")
            .update({ follower_count: artist.followers.total })
            .eq("id", performerId)
            .eq("follower_count", 0);
        }
      } else {
        let slug = generateSlug(artist.name);
        const { data: slugCheck } = await admin
          .from("performers")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (slugCheck) {
          slug = `${slug}-${randomSuffix()}`;
        }

        const { data: newPerformer, error: performerErr } = await admin
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

        if (performerErr || !newPerformer) continue;
        performerId = newPerformer.id;
        performerPhotoUrl = newPerformer.photo_url;
      }

      // Insert collection
      const { error: collectionError } = await admin
        .from("collections")
        .insert({
          fan_id: fan.id,
          performer_id: performerId,
          capture_method: "online",
          verified: false,
        });

      const alreadyDiscovered = collectionError?.code === "23505";
      if (alreadyDiscovered) alreadyHadCount++;

      // Check upcoming events
      const { data: upcomingEvent } = await admin
        .from("events")
        .select("event_date, venues(name)")
        .eq("performer_id", performerId)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const venueName = (upcomingEvent as any)?.venues?.name;

      importedArtists.push({
        name: artist.name,
        performer_id: performerId,
        photo_url: performerPhotoUrl || photoUrl,
        already_discovered: alreadyDiscovered,
        has_upcoming_show: !!upcomingEvent,
        next_show: upcomingEvent
          ? { venue_name: venueName || "TBA", event_date: upcomingEvent.event_date }
          : undefined,
      });
    }

    return NextResponse.json({
      imported: importedArtists.length - alreadyHadCount,
      already_had: alreadyHadCount,
      skipped_mainstream: skippedMainstream,
      artists: importedArtists,
    });
  } catch (err) {
    console.error("[mobile/spotify/import] Error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
