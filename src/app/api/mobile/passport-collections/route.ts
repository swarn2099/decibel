import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify Supabase JWT and return user email
async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

// Seeded rotation from collection id (same as passport route)
function getSeededRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 7) - 3;
}

/**
 * GET /api/mobile/passport-collections
 *
 * Returns paginated collections filtered by collection_type.
 * Used by View More pages (Stamps, Finds, Discoveries).
 *
 * Query params:
 *  - type (required): 'stamp' | 'find' | 'discovery'
 *  - page (optional, default 0): page index for pagination (20 items/page)
 *  - fan_id (optional): view another user's collections
 */
export async function GET(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collectionType = req.nextUrl.searchParams.get("type") as
    | "stamp"
    | "find"
    | "discovery"
    | null;

  if (!collectionType || !["stamp", "find", "discovery"].includes(collectionType)) {
    return NextResponse.json(
      { error: "Query param 'type' is required and must be stamp | find | discovery" },
      { status: 400 }
    );
  }

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0");
  const pageSize = 20;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const targetFanId = req.nextUrl.searchParams.get("fan_id");

  // Resolve the authenticated user's fan record
  const { data: authFan } = await admin
    .from("fans")
    .select("id, name, avatar_url, city, created_at")
    .eq("email", email)
    .single();

  if (!authFan) {
    return NextResponse.json({ error: "Fan not found" }, { status: 404 });
  }

  // Resolve target fan (own or another user)
  let fan = authFan;
  if (targetFanId && targetFanId !== authFan.id) {
    const { data: targetFan } = await admin
      .from("fans")
      .select("id, name, avatar_url, city, created_at")
      .eq("id", targetFanId)
      .single();

    if (!targetFan) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    fan = targetFan;
  }

  // Query collections filtered by collection_type, newest-to-oldest, paginated
  const { data: collections, error: collectionsError } = await admin
    .from("collections")
    .select(
      `id, verified, capture_method, event_date, created_at, collection_type,
       performers!inner (id, name, slug, photo_url, genres, city, spotify_url, soundcloud_url, mixcloud_url),
       venues (name)`
    )
    .eq("fan_id", fan.id)
    .eq("collection_type", collectionType)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (collectionsError) {
    console.error(
      "[passport-collections] Query error:",
      collectionsError.message,
      collectionsError.details
    );
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }

  // Build fan_count map for performers on this page
  const performerIds = (collections ?? []).map((c: Record<string, unknown>) => {
    const p = Array.isArray(c.performers) ? c.performers[0] : c.performers;
    return (p as Record<string, unknown>)?.id as string;
  }).filter(Boolean);

  const { data: fanCountRows } = await admin
    .from("collections")
    .select("performer_id")
    .in("performer_id", performerIds.length > 0 ? performerIds : ["__none__"]);

  const fanCountMap = new Map<string, number>();
  for (const row of fanCountRows ?? []) {
    fanCountMap.set(row.performer_id, (fanCountMap.get(row.performer_id) ?? 0) + 1);
  }

  // Build founder_badges lookup for is_founder flag
  const { data: founderBadges } = await admin
    .from("founder_badges")
    .select("performer_id")
    .eq("fan_id", fan.id);

  const foundedPerformerIds = new Set(
    (founderBadges ?? []).map((f: { performer_id: string }) => f.performer_id)
  );

  // For discovery cards: get founder info for each performer to show "via @founder"
  // The "via" on discovery cards = who originally founded the artist on Decibel
  let founderNameMap = new Map<string, { name: string | null; id: string | null }>();
  if (collectionType === "discovery" && performerIds.length > 0) {
    const { data: founderRows } = await admin
      .from("founder_badges")
      .select("performer_id, fan_id, fans!founder_badges_fan_id_fkey (id, name)")
      .in("performer_id", performerIds);

    for (const row of founderRows ?? []) {
      const founderFan = Array.isArray(row.fans) ? row.fans[0] : row.fans;
      founderNameMap.set(row.performer_id, {
        name: (founderFan as Record<string, unknown> | null)?.name as string | null ?? null,
        id: (founderFan as Record<string, unknown> | null)?.id as string | null ?? null,
      });
    }
  }

  // Map to CollectionStamp shape
  const result = (collections ?? []).map((c: Record<string, unknown>) => {
    const performer = Array.isArray(c.performers) ? c.performers[0] : c.performers;
    const venue = Array.isArray(c.venues) ? c.venues[0] : c.venues;
    const performerId = (performer as Record<string, unknown>)?.id as string;
    const isFounder = foundedPerformerIds.has(performerId);

    const p = performer as Record<string, unknown>;
    const platformUrl =
      (p.spotify_url as string | null) ??
      (p.soundcloud_url as string | null) ??
      (p.mixcloud_url as string | null) ??
      null;

    // For discoveries, show the founder as the "via" reference
    const finderInfo =
      collectionType === "discovery"
        ? founderNameMap.get(performerId) ?? { name: null, id: null }
        : { name: null, id: null };

    return {
      id: c.id,
      performer: {
        id: performerId,
        name: (p?.name as string) ?? "Unknown",
        slug: (p?.slug as string) ?? "",
        photo_url: (p?.photo_url as string) ?? null,
        genres: (p?.genres as string[]) ?? [],
        city: (p?.city as string) ?? "",
        platform_url: platformUrl,
      },
      venue: venue
        ? { name: (venue as Record<string, unknown>).name as string }
        : null,
      event_date: c.event_date ?? null,
      capture_method: c.capture_method,
      verified: c.verified,
      created_at: c.created_at,
      scan_count: null,
      current_tier: null,
      is_founder: isFounder,
      rotation: getSeededRotation(c.id as string),
      fan_count: fanCountMap.get(performerId) ?? 0,
      collection_type: collectionType,
      finder_username: finderInfo.name,
      finder_fan_id: finderInfo.id,
    };
  });

  return NextResponse.json({
    collections: result,
    hasMore: result.length === pageSize,
  });
}
