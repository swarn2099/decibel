import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSpotifyArtist } from "@/lib/spotify";

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

interface AddArtistRequest {
  spotify_id: string;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to add artists" }, { status: 401 });
    }

    const body: AddArtistRequest = await req.json();
    if (!body.spotify_id) {
      return NextResponse.json({ error: "Missing spotify_id" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // Check if this Spotify artist already exists
    const { data: existingBySpotify } = await admin
      .from("performers")
      .select("id, name, slug")
      .eq("spotify_id", body.spotify_id)
      .maybeSingle();

    if (existingBySpotify) {
      // Check founder
      const { data: founder } = await admin
        .from("founder_badges")
        .select("fan_id, fans(name, email)")
        .eq("performer_id", existingBySpotify.id)
        .maybeSingle();

      return NextResponse.json({
        already_exists: true,
        performer: existingBySpotify,
        founder: founder
          ? {
              name:
                (founder.fans as unknown as { name: string | null; email: string })
                  ?.name ||
                (founder.fans as unknown as { name: string | null; email: string })
                  ?.email ||
                "Someone",
            }
          : null,
      });
    }

    // Fetch full artist data from Spotify
    const spotifyArtist = await getSpotifyArtist(body.spotify_id);
    if (!spotifyArtist) {
      return NextResponse.json({ error: "Artist not found on Spotify" }, { status: 404 });
    }

    // Generate unique slug
    let slug = generateSlug(spotifyArtist.name);
    const { data: slugCheck } = await admin
      .from("performers")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (slugCheck) {
      slug = `${slug}-${randomSuffix()}`;
    }

    // Create performer
    const { data: performer, error: createErr } = await admin
      .from("performers")
      .insert({
        name: spotifyArtist.name,
        slug,
        photo_url: spotifyArtist.photo_url,
        genres: spotifyArtist.genres,
        follower_count: spotifyArtist.followers,
        spotify_url: spotifyArtist.spotify_url,
        spotify_id: spotifyArtist.id,
        monthly_listeners: spotifyArtist.monthly_listeners,
        claimed: false,
      })
      .select("id, name, slug")
      .single();

    if (createErr || !performer) {
      return NextResponse.json(
        { error: "Failed to create performer" },
        { status: 500 }
      );
    }

    // Get or create fan record
    let { data: fan } = await admin
      .from("fans")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!fan) {
      const { data: newFan } = await admin
        .from("fans")
        .upsert({ email: user.email }, { onConflict: "email" })
        .select("id")
        .single();
      fan = newFan;
    }

    if (!fan) {
      return NextResponse.json({ error: "Failed to resolve fan" }, { status: 500 });
    }

    // Award founder badge (unique on performer_id — first one wins)
    const { error: founderErr } = await admin
      .from("founder_badges")
      .insert({
        fan_id: fan.id,
        performer_id: performer.id,
      });

    const isFounder = !founderErr;

    // Auto-discover: add to fan's collection
    await admin.from("collections").insert({
      fan_id: fan.id,
      performer_id: performer.id,
      capture_method: "online",
      verified: false,
    });

    return NextResponse.json({
      success: true,
      performer,
      is_founder: isFounder,
      fan_name: null, // we'll fetch this client-side if needed
    });
  } catch (err) {
    console.error("add-artist error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
