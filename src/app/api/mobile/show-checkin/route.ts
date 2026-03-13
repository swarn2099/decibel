import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/** Extract and verify Bearer token. Returns auth user email, or null if invalid. */
async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user?.email) return null;
  return data.user.email;
}

/** Get the auth.users UUID from the Bearer token — needed for search_results user_id. */
async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user?.id) return null;
  return data.user.id;
}

// ─── Haversine ────────────────────────────────────────────────────────────────

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedPerformer {
  id: string;
  name: string;
  photo_url: string | null;
  soundcloud_url: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  is_founder_available: boolean;
  founder_fan_id: string | null;
}

interface VenueRow {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

interface PerformerRow {
  id: string;
  name: string;
  photo_url: string | null;
  soundcloud_url: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
}

// ─── POST /api/mobile/show-checkin ────────────────────────────────────────────

/**
 * Layer 1 fast path + fire-and-forget VM dispatch.
 *
 * Body: { lat, lng, local_date, venue_hint? }
 *
 * Returns:
 *   - { status: 'found', venue, performers } — if DB has tonight's lineup
 *   - { status: 'searching', searchId } — if DB misses; VM scraper is fired async
 */
export async function POST(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    lat?: number;
    lng?: number;
    local_date?: string;
    venue_hint?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { lat, lng, local_date, venue_hint } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "lat and lng are required numbers" },
      { status: 400 }
    );
  }
  if (!local_date || !/^\d{4}-\d{2}-\d{2}$/.test(local_date)) {
    return NextResponse.json(
      { error: "local_date is required in YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  // ─── Layer 1: DB venue + lineup lookup ──────────────────────────────────────

  // Fetch all venues for Haversine filtering (small set ~200 rows)
  const { data: venues, error: venueErr } = await admin
    .from("venues")
    .select("id, name, latitude, longitude");

  if (!venueErr && venues && venues.length > 0) {
    // Filter to 200m radius
    const nearbyVenues = (venues as VenueRow[]).filter((v) => {
      if (v.latitude == null || v.longitude == null) return false;
      return haversineMeters(lat, lng, v.latitude, v.longitude) <= 200;
    });

    if (nearbyVenues.length > 0) {
      // Pick closest venue
      const closestVenue = nearbyVenues.reduce((closest, v) => {
        const d = haversineMeters(lat, lng, v.latitude!, v.longitude!);
        const dc = haversineMeters(lat, lng, closest.latitude!, closest.longitude!);
        return d < dc ? v : closest;
      });

      // Query events + performers for tonight
      const [eventArtistsResult, eventsResult, taggedResult] = await Promise.all([
        admin
          .from("event_artists")
          .select("performer_id, performers(id, name, photo_url, soundcloud_url, spotify_url, apple_music_url)")
          .eq("venue_id", closestVenue.id)
          .eq("event_date", local_date),
        admin
          .from("events")
          .select("performer_id, performers(id, name, photo_url, soundcloud_url, spotify_url, apple_music_url)")
          .eq("venue_id", closestVenue.id)
          .eq("event_date", local_date),
        admin
          .from("user_tagged_events")
          .select("performer_name, platform_url")
          .eq("venue_id", closestVenue.id)
          .eq("event_date", local_date),
      ]);

      const seenIds = new Set<string>();
      const rawPerformers: PerformerRow[] = [];

      for (const ea of eventArtistsResult.data ?? []) {
        const p = (ea as Record<string, unknown>).performers as PerformerRow | null;
        if (!p || seenIds.has(p.id)) continue;
        seenIds.add(p.id);
        rawPerformers.push(p);
      }

      for (const ev of eventsResult.data ?? []) {
        const p = (ev as Record<string, unknown>).performers as PerformerRow | null;
        if (!p || seenIds.has(p.id)) continue;
        seenIds.add(p.id);
        rawPerformers.push(p);
      }

      if (rawPerformers.length > 0) {
        // Enrich each performer with founder availability
        const enrichedPerformers: EnrichedPerformer[] = await Promise.all(
          rawPerformers.map(async (performer) => {
            const { data: founderBadge } = await admin
              .from("founder_badges")
              .select("fan_id")
              .eq("performer_id", performer.id)
              .maybeSingle();

            return {
              ...performer,
              is_founder_available: !founderBadge,
              founder_fan_id: founderBadge?.fan_id ?? null,
            };
          })
        );

        // Also include any tagged performers (crowdsourced, no DB enrichment)
        const taggedPerformers = (taggedResult.data ?? [])
          .filter((te) => te.performer_name)
          .map((te) => ({
            id: `tagged_${encodeURIComponent(te.performer_name)}`,
            name: te.performer_name as string,
            photo_url: null,
            soundcloud_url: te.platform_url ?? null,
            spotify_url: null,
            apple_music_url: null,
            is_founder_available: true, // crowdsourced — founder status unknown
            founder_fan_id: null,
          }));

        return NextResponse.json({
          status: "found",
          venue: {
            id: closestVenue.id,
            name: closestVenue.name,
          },
          performers: [...enrichedPerformers, ...taggedPerformers],
        });
      }
    }
  }

  // ─── Layer 1 miss — fire-and-forget VM dispatch ───────────────────────────

  const searchId = crypto.randomUUID();
  const authUserId = await getAuthUserId(req);

  if (!authUserId) {
    // Should not happen (auth passed above) but guard anyway
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scraperUrl = process.env.VM_SCRAPER_URL;
  const scraperSecret = process.env.SCRAPER_SHARED_SECRET;

  if (scraperUrl && scraperSecret) {
    // Fire-and-forget — mobile listens via Realtime subscription on searchId
    fetch(`${scraperUrl}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-secret": scraperSecret,
      },
      body: JSON.stringify({
        searchId,
        userId: authUserId,
        lat,
        lng,
        localDate: local_date,
        venueName: venue_hint,
      }),
    }).catch(() => {}); // swallow — VM is best-effort
  } else {
    console.warn("[show-checkin] VM_SCRAPER_URL or SCRAPER_SHARED_SECRET not set — skipping VM dispatch");
  }

  return NextResponse.json({ status: "searching", searchId });
}

// ─── PUT /api/mobile/show-checkin — collect lineup artists ───────────────────

/**
 * Award Founder badge + Stamp simultaneously for each performer in the lineup.
 *
 * Body: { venue_id, performer_ids, local_date }
 *
 * For each performer:
 *   - Check if founder exists in founder_badges
 *   - If no founder: INSERT into founder_badges (race-safe: ignore conflict)
 *   - INSERT into collections with collection_type='stamp', capture_method='location', verified=true
 *
 * Returns: { stamps: [...], founders: [performer_ids_where_founded] }
 */
export async function PUT(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    venue_id?: string;
    performer_ids?: string[];
    local_date?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { venue_id, performer_ids, local_date } = body;

  if (!venue_id || typeof venue_id !== "string") {
    return NextResponse.json({ error: "venue_id is required" }, { status: 400 });
  }
  if (!Array.isArray(performer_ids) || performer_ids.length === 0) {
    return NextResponse.json(
      { error: "performer_ids must be a non-empty array" },
      { status: 400 }
    );
  }
  if (!local_date || !/^\d{4}-\d{2}-\d{2}$/.test(local_date)) {
    return NextResponse.json(
      { error: "local_date is required in YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  // Look up fan by email
  const { data: fan, error: fanError } = await admin
    .from("fans")
    .select("id")
    .eq("email", email)
    .single();

  if (fanError || !fan) {
    return NextResponse.json({ error: "Fan profile not found" }, { status: 404 });
  }

  const stamps: Array<{ performer_id: string; performer_name: string | null; is_founder: boolean }> = [];
  const founderIds: string[] = [];

  for (const performerId of performer_ids) {
    // Check if this performer already has a founder
    const { data: existingFounder } = await admin
      .from("founder_badges")
      .select("fan_id")
      .eq("performer_id", performerId)
      .maybeSingle();

    const isFounder = !existingFounder;

    if (isFounder) {
      // Race-safe INSERT — ignore conflict if another request beats us
      const { error: founderInsertErr } = await admin
        .from("founder_badges")
        .insert({ performer_id: performerId, fan_id: fan.id });

      // Ignore unique constraint violation (23505) — another user claimed founder first
      if (founderInsertErr && founderInsertErr.code !== "23505") {
        console.error(`[show-checkin PUT] Founder insert error for performer ${performerId}:`, founderInsertErr.message);
      }

      // Re-check to confirm we got it (vs losing the race)
      const { data: confirmedFounder } = await admin
        .from("founder_badges")
        .select("fan_id")
        .eq("performer_id", performerId)
        .maybeSingle();

      if (confirmedFounder?.fan_id === fan.id) {
        founderIds.push(performerId);
      }
    }

    // INSERT stamp collection (ignore conflict — duplicate check-in is fine)
    const { error: stampError } = await admin.from("collections").insert({
      fan_id: fan.id,
      performer_id: performerId,
      venue_id,
      event_date: local_date,
      collection_type: "stamp",
      capture_method: "location",
      verified: true,
    });

    // 23505 = unique constraint violation — already checked in, that's OK
    if (stampError && stampError.code !== "23505") {
      console.error(`[show-checkin PUT] Stamp insert error for performer ${performerId}:`, stampError.message);
      continue;
    }

    // Fetch performer name for response
    const { data: performer } = await admin
      .from("performers")
      .select("name")
      .eq("id", performerId)
      .maybeSingle();

    stamps.push({
      performer_id: performerId,
      performer_name: performer?.name ?? null,
      is_founder: founderIds.includes(performerId),
    });
  }

  return NextResponse.json({ stamps, founders: founderIds });
}
