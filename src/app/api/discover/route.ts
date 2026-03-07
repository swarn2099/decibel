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

  // Check slug uniqueness
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
    // Auth check
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

    // Get fan by auth email
    const { data: fan } = await supabaseAdmin
      .from("fans")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!fan) {
      // Auto-create fan record
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
      return handleDiscovery(supabaseAdmin, newFan.id, performer_id, resolved_artist);
    }

    return handleDiscovery(supabaseAdmin, fan.id, performer_id, resolved_artist);
  } catch {
    return NextResponse.json(
      { success: false } satisfies DiscoverResponse,
      { status: 500 }
    );
  }
}

async function handleDiscovery(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  fanId: string,
  performerId?: string,
  resolvedArtist?: ResolvedArtist
) {
  let targetPerformerId = performerId;
  let performerName = "";

  if (!targetPerformerId && resolvedArtist) {
    // Auto-create performer
    const performer = await createPerformer(supabase, resolvedArtist);
    targetPerformerId = performer.id;
    performerName = performer.name;
  } else if (targetPerformerId) {
    // Get performer name for response
    const { data } = await supabase
      .from("performers")
      .select("name")
      .eq("id", targetPerformerId)
      .maybeSingle();
    performerName = data?.name || "";
  }

  if (!targetPerformerId) {
    return NextResponse.json(
      { success: false } satisfies DiscoverResponse,
      { status: 400 }
    );
  }

  // Insert collection
  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .insert({
      fan_id: fanId,
      performer_id: targetPerformerId,
      capture_method: "online",
      verified: false,
    })
    .select("id")
    .single();

  // Handle unique constraint violation (already discovered)
  if (collectionError?.code === "23505") {
    return NextResponse.json({
      success: true,
      performer_id: targetPerformerId,
      performer_name: performerName,
      already_discovered: true,
    } satisfies DiscoverResponse);
  }

  if (collectionError) {
    return NextResponse.json(
      { success: false } satisfies DiscoverResponse,
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    collection_id: collection.id,
    performer_id: targetPerformerId,
    performer_name: performerName,
    already_discovered: false,
  } satisfies DiscoverResponse);
}
