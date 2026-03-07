import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import type {
  DiscoverRequest,
  DiscoverResponse,
  ResolvedArtist,
} from "@/lib/types/discovery";

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

async function createPerformer(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  artist: ResolvedArtist
) {
  let slug = generateSlug(artist.name);

  const { data: existing } = await supabase
    .from("performers")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    slug = `${slug}-${randomSuffix()}`;
  }

  const { data, error } = await supabase
    .from("performers")
    .insert({
      name: artist.name,
      slug,
      photo_url: artist.photo_url || null,
      soundcloud_url: artist.soundcloud_url || null,
      ra_url: artist.ra_url || null,
      instagram_handle: artist.instagram_handle || null,
      spotify_id: artist.spotify_id || null,
      spotify_url: artist.spotify_url || null,
      city: null,
      genres: artist.genres || [],
      claimed: false,
    })
    .select("id, name, slug")
    .single();

  if (error) throw new Error(`Failed to create performer: ${error.message}`);
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false } satisfies DiscoverResponse,
        { status: 401 }
      );
    }

    const body: DiscoverRequest = await req.json();
    const { performer_id, resolved_artist } = body;

    if (!performer_id && !resolved_artist) {
      return NextResponse.json(
        { success: false } satisfies DiscoverResponse,
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Get or create fan
    let fanId: string;
    const { data: fan } = await supabaseAdmin
      .from("fans")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

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
          { success: false } satisfies DiscoverResponse,
          { status: 500 }
        );
      }
      fanId = newFan.id;
    }

    let targetPerformerId = performer_id;
    let performerName = "";
    let performerSlug = "";
    let isNewPerformer = false;

    if (!targetPerformerId && resolved_artist) {
      const performer = await createPerformer(supabaseAdmin, resolved_artist);
      targetPerformerId = performer.id;
      performerName = performer.name;
      performerSlug = performer.slug;
      isNewPerformer = true;
    } else if (targetPerformerId) {
      const { data } = await supabaseAdmin
        .from("performers")
        .select("name, slug")
        .eq("id", targetPerformerId)
        .maybeSingle();
      performerName = data?.name || "";
      performerSlug = data?.slug || "";
    }

    if (!targetPerformerId) {
      return NextResponse.json(
        { success: false } satisfies DiscoverResponse,
        { status: 400 }
      );
    }

    // Insert collection
    const { data: collection, error: collectionError } = await supabaseAdmin
      .from("collections")
      .insert({
        fan_id: fanId,
        performer_id: targetPerformerId,
        capture_method: "online",
        verified: false,
      })
      .select("id")
      .single();

    if (collectionError?.code === "23505") {
      return NextResponse.json({
        success: true,
        performer_id: targetPerformerId,
        performer_name: performerName,
        performer_slug: performerSlug,
        already_discovered: true,
      } satisfies DiscoverResponse);
    }

    if (collectionError) {
      return NextResponse.json(
        { success: false } satisfies DiscoverResponse,
        { status: 500 }
      );
    }

    // Award founder badge (first person to discover/add this artist)
    let isFounder = false;
    try {
      const { error: founderError } = await supabaseAdmin
        .from("founder_badges")
        .insert({
          fan_id: fanId,
          performer_id: targetPerformerId,
        });
      if (!founderError) {
        isFounder = true;
      }
    } catch {
      // Unique constraint violation = someone else was first, that's fine
    }

    return NextResponse.json({
      success: true,
      collection_id: collection.id,
      performer_id: targetPerformerId,
      performer_name: performerName,
      performer_slug: performerSlug,
      already_discovered: false,
      is_founder: isFounder,
    } satisfies DiscoverResponse);
  } catch {
    return NextResponse.json(
      { success: false } satisfies DiscoverResponse,
      { status: 500 }
    );
  }
}
