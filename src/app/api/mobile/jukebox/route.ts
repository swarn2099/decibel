import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user?.email) return null;
  return data.user.email;
}

// Derive embed URL from the stored source URL when embed column is null
function deriveEmbedUrl(
  spotifyUrl: string | null,
  soundcloudUrl: string | null
): { platform: "spotify" | "soundcloud" | "apple_music" | null; embedUrl: string | null } {
  if (spotifyUrl) {
    // https://open.spotify.com/artist/ABC -> https://open.spotify.com/embed/artist/ABC
    const match = spotifyUrl.match(/open\.spotify\.com\/(artist\/[A-Za-z0-9]+)/);
    if (match) {
      return {
        platform: "spotify",
        embedUrl: `https://open.spotify.com/embed/${match[1]}`,
      };
    }
    return { platform: "spotify", embedUrl: null };
  }

  if (soundcloudUrl) {
    // https://soundcloud.com/slug -> SoundCloud widget player
    // Normalize URL: remove m. subdomain, ensure https
    let normalized = soundcloudUrl
      .replace(/^(https?:\/\/)?(m\.|www\.)?/, "https://")
      .replace("https://soundcloud", "https://soundcloud");
    if (!normalized.startsWith("https://soundcloud")) {
      normalized = `https://soundcloud.com/${soundcloudUrl.replace(/^.*soundcloud\.com\//, "")}`;
    }
    return {
      platform: "soundcloud",
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(normalized)}&auto_play=false&visual=true`,
    };
  }

  return { platform: null, embedUrl: null };
}

// GET /api/mobile/jukebox
// Returns paginated Finds from users the authenticated fan follows (last 48h).
// Falls back to all-platform Finds if followed users have no recent Finds.
export async function GET(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0");
  const pageSize = 20;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  // Step 1: Get fan by email
  const { data: fan, error: fanError } = await admin
    .from("fans")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (fanError || !fan) {
    return NextResponse.json({ error: "Fan not found" }, { status: 404 });
  }

  // Step 2: Get fan's following IDs
  const { data: followRows } = await admin
    .from("fan_follows")
    .select("following_id")
    .eq("follower_id", fan.id);

  const followingIds = (followRows ?? []).map((r: { following_id: string }) => r.following_id);

  // 48 hours ago
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  type CollectionRow = {
    id: string;
    fan_id: string;
    created_at: string;
    fans: { id: string; name: string; avatar_url: string | null } | null;
    performers: {
      id: string;
      name: string;
      slug: string;
      photo_url: string | null;
      genres: string[] | null;
      spotify_url: string | null;
      soundcloud_url: string | null;
      spotify_embed_url: string | null;
      soundcloud_embed_url: string | null;
    } | null;
  };

  // Step 3: Query collections with following filter
  let isFallback = false;
  let collections: CollectionRow[] = [];
  let hasNextPage = false;

  if (followingIds.length > 0) {
    const { data } = await admin
      .from("collections")
      .select(
        `id, fan_id, created_at,
         fans!collections_fan_id_fkey (id, name, avatar_url),
         performers!inner (id, name, slug, photo_url, genres, spotify_url, soundcloud_url, spotify_embed_url, soundcloud_embed_url)`
      )
      .eq("collection_type", "find")
      .gte("created_at", cutoff)
      .in("fan_id", followingIds)
      .order("created_at", { ascending: false })
      .range(from, to + 1); // fetch one extra to determine hasNextPage

    collections = (data ?? []) as unknown as CollectionRow[];
  }

  // Step 4: Fallback — if following Ids exist but no results, query all Finds (no fan filter)
  if (followingIds.length > 0 && collections.length === 0) {
    isFallback = true;
  }

  if (isFallback || followingIds.length === 0) {
    const { data } = await admin
      .from("collections")
      .select(
        `id, fan_id, created_at,
         fans!collections_fan_id_fkey (id, name, avatar_url),
         performers!inner (id, name, slug, photo_url, genres, spotify_url, soundcloud_url, spotify_embed_url, soundcloud_embed_url)`
      )
      .eq("collection_type", "find")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .range(from, to + 1);

    collections = (data ?? []) as unknown as CollectionRow[];
    isFallback = true;
  }

  // Determine pagination
  if (collections.length > pageSize) {
    hasNextPage = true;
    collections = collections.slice(0, pageSize);
  }

  // Step 5+6+7: Map to JukeboxItem with embed URL derivation
  // Collect performers that need embed URL backfill (fire-and-forget)
  const needsBackfill: Array<{ id: string; spotify_embed_url: string; soundcloud_embed_url?: string }> = [];

  const items = collections.map((c) => {
    const fan = Array.isArray(c.fans) ? c.fans[0] : c.fans;
    const performer = Array.isArray(c.performers) ? c.performers[0] : c.performers;

    if (!performer) {
      return null;
    }

    // Use stored embed URLs if available, else derive
    let embedUrl: string | null = null;
    let platform: "spotify" | "soundcloud" | "apple_music" | null = null;

    if (performer.spotify_embed_url) {
      embedUrl = performer.spotify_embed_url;
      platform = "spotify";
    } else if (performer.soundcloud_embed_url) {
      embedUrl = performer.soundcloud_embed_url;
      platform = "soundcloud";
    } else {
      // Derive from source URL
      const derived = deriveEmbedUrl(
        performer.spotify_url ?? null,
        performer.soundcloud_url ?? null
      );
      embedUrl = derived.embedUrl;
      platform = derived.platform;

      // Queue backfill if we derived successfully
      if (derived.platform === "spotify" && derived.embedUrl) {
        needsBackfill.push({
          id: performer.id,
          spotify_embed_url: derived.embedUrl,
        });
      } else if (derived.platform === "soundcloud" && derived.embedUrl) {
        needsBackfill.push({
          id: performer.id,
          spotify_embed_url: derived.embedUrl, // reuse field placeholder
          soundcloud_embed_url: derived.embedUrl,
        });
      }
    }

    return {
      id: c.id,
      fan_id: c.fan_id,
      fan_name: (fan as { name: string } | null)?.name ?? "Unknown",
      fan_avatar: (fan as { avatar_url: string | null } | null)?.avatar_url ?? null,
      created_at: c.created_at,
      performer_id: performer.id,
      performer_name: performer.name,
      performer_slug: performer.slug,
      performer_photo: performer.photo_url,
      genres: performer.genres,
      platform,
      embed_url: embedUrl,
      spotify_url: performer.spotify_url ?? null,
      soundcloud_url: performer.soundcloud_url ?? null,
      apple_music_url: null, // apple_music_url not yet in performers schema
    };
  }).filter(Boolean);

  // Step 6: Fire-and-forget backfill of derived embed URLs
  if (needsBackfill.length > 0) {
    const backfillPromises = needsBackfill.map((row) => {
      const update: Record<string, string> = {};
      if (row.soundcloud_embed_url) {
        update.soundcloud_embed_url = row.soundcloud_embed_url;
      } else {
        update.spotify_embed_url = row.spotify_embed_url;
      }
      return admin
        .from("performers")
        .update(update)
        .eq("id", row.id);
    });
    // Fire and forget — don't await, don't block response
    Promise.allSettled(backfillPromises).catch(() => {});
  }

  return NextResponse.json({
    items,
    hasNextPage,
    isFallback,
  });
}
