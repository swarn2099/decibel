import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSpotifyArtist, scrapeMonthlyListeners } from "@/lib/spotify";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SOUNDCLOUD_CLIENT_ID = "nIjtjiYnjkOhMyh5xrbqEW12DxeJVnic";

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user?.email) return null;
  return data.user.email;
}

// ── Platform detection ────────────────────────────────────────────────────────

type Platform = "spotify" | "soundcloud" | "apple_music";

interface ParsedUrl {
  platform: Platform;
  identifier: string; // artistId for Spotify, username for SoundCloud, name for Apple Music
  resolvedUrl: string; // canonical URL after redirect resolution
}

/**
 * Attempts to resolve a short URL by following the redirect
 * server-side and returning the canonical URL.
 */
async function resolveShortLink(url: string, expectedHost: string): Promise<string | null> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    // Try redirect: "manual" first to capture Location header
    const res = await fetch(fullUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    const location = res.headers.get("location");
    if (location && location.includes(expectedHost)) return location;

    // Fall back to following the redirect and reading the final URL
    const followed = await fetch(fullUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    if (followed.url.includes(expectedHost)) return followed.url;
    return null;
  } catch {
    return null;
  }
}

async function resolveSpotifyShortLink(url: string): Promise<string | null> {
  return resolveShortLink(url, "open.spotify.com");
}

async function resolveSoundCloudShortLink(url: string): Promise<string | null> {
  return resolveShortLink(url, "soundcloud.com");
}

async function parseUrl(rawUrl: string): Promise<ParsedUrl | null> {
  const url = rawUrl.trim();

  // Spotify URI format: spotify:artist:ARTIST_ID
  const uriMatch = url.match(/^spotify:artist:([a-zA-Z0-9]+)$/);
  if (uriMatch) {
    return {
      platform: "spotify",
      identifier: uriMatch[1],
      resolvedUrl: `https://open.spotify.com/artist/${uriMatch[1]}`,
    };
  }

  // Spotify short link: spotify.link/...
  if (/spotify\.link\//i.test(url)) {
    const resolved = await resolveSpotifyShortLink(url);
    if (!resolved) return null;
    const spotifyMatch = resolved.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/i);
    if (spotifyMatch) {
      return {
        platform: "spotify",
        identifier: spotifyMatch[1],
        resolvedUrl: `https://open.spotify.com/artist/${spotifyMatch[1]}`,
      };
    }
    return null;
  }

  // Spotify: open.spotify.com/artist/ID
  const spotifyMatch = url.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/i);
  if (spotifyMatch) {
    return {
      platform: "spotify",
      identifier: spotifyMatch[1],
      resolvedUrl: `https://open.spotify.com/artist/${spotifyMatch[1]}`,
    };
  }

  // SoundCloud short link: on.soundcloud.com/...
  if (/on\.soundcloud\.com\//i.test(url)) {
    const resolved = await resolveSoundCloudShortLink(url);
    if (!resolved) return null;
    const scResolvedMatch = resolved.match(/(?:https?:\/\/)?(?:www\.|m\.)?soundcloud\.com\/([a-zA-Z0-9_-]+)\/?/i);
    if (scResolvedMatch && scResolvedMatch[1] !== "search" && scResolvedMatch[1] !== "discover") {
      return {
        platform: "soundcloud",
        identifier: scResolvedMatch[1],
        resolvedUrl: `https://soundcloud.com/${scResolvedMatch[1]}`,
      };
    }
    return null;
  }

  // SoundCloud: soundcloud.com/username (support www/m subdomains, no https required)
  const scMatch = url.match(/(?:https?:\/\/)?(?:www\.|m\.)?soundcloud\.com\/([a-zA-Z0-9_-]+)\/?/i);
  if (scMatch && scMatch[1] !== "search" && scMatch[1] !== "discover") {
    return {
      platform: "soundcloud",
      identifier: scMatch[1],
      resolvedUrl: `https://soundcloud.com/${scMatch[1]}`,
    };
  }

  // Apple Music: music.apple.com/.../artist/name/id or itunes.apple.com/.../artist/name/id
  const appleMatch = url.match(/(?:music|itunes)\.apple\.com\/[^/]+\/artist\/([^/?]+)(?:\/(\d+))?/i);
  if (appleMatch) {
    const artistName = decodeURIComponent(appleMatch[1].replace(/-/g, " "));
    return {
      platform: "apple_music",
      identifier: artistName,
      resolvedUrl: url,
    };
  }

  return null;
}

// ── Existing performer lookup ─────────────────────────────────────────────────

interface ExistingPerformerRow {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
}

async function findExistingPerformer(
  spotifyId: string | undefined,
  soundcloudUrl: string | undefined,
  artistName: string
): Promise<ExistingPerformerRow | null> {
  if (spotifyId) {
    const { data } = await admin
      .from("performers")
      .select("id, name, slug, photo_url")
      .eq("spotify_id", spotifyId)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  if (soundcloudUrl) {
    const { data } = await admin
      .from("performers")
      .select("id, name, slug, photo_url")
      .eq("soundcloud_url", soundcloudUrl)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  // Fallback: case-insensitive name match
  const { data } = await admin
    .from("performers")
    .select("id, name, slug, photo_url")
    .ilike("name", artistName)
    .limit(1)
    .maybeSingle();
  return data;
}

// ── User relationship ─────────────────────────────────────────────────────────

type UserRelationship = "founded" | "collected" | "discovered" | "none";

async function getUserRelationship(
  fanId: string,
  performerId: string
): Promise<UserRelationship> {
  const [collectionsRow, founderRow] = await Promise.all([
    admin
      .from("collections")
      .select("id, capture_method, verified")
      .eq("fan_id", fanId)
      .eq("performer_id", performerId)
      .maybeSingle(),
    admin
      .from("founder_badges")
      .select("fan_id")
      .eq("performer_id", performerId)
      .maybeSingle(),
  ]);

  const isFounder = founderRow?.data?.fan_id === fanId;
  if (isFounder) return "founded";

  if (collectionsRow?.data) {
    const col = collectionsRow.data as { capture_method?: string; verified?: boolean };
    if (col.capture_method === "live" || col.verified) return "collected";
    return "discovered";
  }

  return "none";
}

// ── Spotify cross-reference for Apple Music ───────────────────────────────────

async function probeSpotifyByName(name: string): Promise<{
  spotify_id?: string;
  monthly_listeners?: number | null;
  photo_url?: string | null;
  genres?: string[];
} | null> {
  try {
    const { searchSpotifyArtists } = await import("@/lib/spotify");
    const results = await searchSpotifyArtists(name, 5);
    if (!results || results.length === 0) return null;

    const nameLower = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = results.find(
      (r) => r.name.toLowerCase().replace(/[^a-z0-9]/g, "") === nameLower
    );
    if (!match) return null;

    // Scrape monthly listeners for the matched artist
    const listeners = await scrapeMonthlyListeners(match.id);
    return {
      spotify_id: match.id,
      monthly_listeners: listeners,
      photo_url: match.photo_url,
      genres: match.genres,
    };
  } catch {
    return null;
  }
}

// ── Response types ────────────────────────────────────────────────────────────

interface ValidateResponse {
  eligible: boolean;
  rejection_reason?: "over_threshold" | "unsupported_platform";
  artist?: {
    name: string;
    photo_url: string | null;
    platform: Platform;
    spotify_id?: string;
    soundcloud_username?: string;
    apple_music_url?: string;
    monthly_listeners?: number | null;
    follower_count?: number;
    genres: string[];
  };
  existing_performer?: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
    user_relationship: UserRelationship;
    founder_name: string | null;
  };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get fan_id
  const { data: fan } = await admin
    .from("fans")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!fan) {
    return NextResponse.json({ error: "Fan profile not found" }, { status: 404 });
  }
  const fanId: string = fan.id;

  // Parse body
  let url: string;
  try {
    const body = await req.json();
    url = body?.url;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Parse URL → platform
  let parsed: ParsedUrl | null;
  try {
    parsed = await parseUrl(url);
  } catch {
    parsed = null;
  }

  if (!parsed) {
    const response: ValidateResponse = {
      eligible: false,
      rejection_reason: "unsupported_platform",
    };
    return NextResponse.json(response);
  }

  const { platform, identifier, resolvedUrl } = parsed;

  // ── Spotify resolution ────────────────────────────────────────────────────

  if (platform === "spotify") {
    // Use oEmbed (public, no API key needed — avoids Spotify dev mode 5-user limit)
    let oembedData: { title?: string; thumbnail_url?: string } | null = null;
    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/artist/${identifier}`;
      const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
      }
    } catch {
      // oEmbed failed — will fall back to Spotify Web API below
    }

    // Fall back to Spotify Web API if oEmbed failed
    let spotifyArtist: { id: string; name: string; photo_url: string | null; genres: string[] } | null = null;
    if (oembedData?.title) {
      spotifyArtist = {
        id: identifier,
        name: oembedData.title,
        photo_url: oembedData.thumbnail_url ?? null,
        genres: [],
      };
    } else {
      try {
        const apiArtist = await getSpotifyArtist(identifier);
        if (apiArtist) {
          spotifyArtist = {
            id: apiArtist.id,
            name: apiArtist.name,
            photo_url: apiArtist.photo_url,
            genres: apiArtist.genres,
          };
        }
      } catch {
        // Both oEmbed and Web API failed
      }
    }

    if (!spotifyArtist) {
      return NextResponse.json(
        { error: "Artist not found on Spotify" },
        { status: 404 }
      );
    }

    // Try to get genres from Spotify Web API if oEmbed was used (oEmbed doesn't return genres)
    if (oembedData?.title && spotifyArtist.genres.length === 0) {
      try {
        const apiArtist = await getSpotifyArtist(identifier);
        if (apiArtist?.genres?.length) {
          spotifyArtist.genres = apiArtist.genres;
        }
      } catch {
        // Genres are nice-to-have, not critical
      }
    }

    let monthlyListeners: number | null = null;
    try {
      monthlyListeners = await scrapeMonthlyListeners(identifier);
    } catch {
      monthlyListeners = null;
    }

    // Gate: reject if listeners confirmed >= 1M (null = unverified = pass through)
    if (monthlyListeners !== null && monthlyListeners >= 1_000_000) {
      const response: ValidateResponse = {
        eligible: false,
        rejection_reason: "over_threshold",
        artist: {
          name: spotifyArtist.name,
          photo_url: spotifyArtist.photo_url,
          platform: "spotify",
          spotify_id: spotifyArtist.id,
          monthly_listeners: monthlyListeners,
          genres: spotifyArtist.genres,
        },
      };
      return NextResponse.json(response);
    }

    // Check existing performer
    const existing = await findExistingPerformer(spotifyArtist.id, undefined, spotifyArtist.name);
    let existingPerformerData: ValidateResponse["existing_performer"] | undefined;

    if (existing) {
      const relationship = await getUserRelationship(fanId, existing.id);
      const { data: founderData } = await admin
        .from("founder_badges")
        .select("fan_id, fan:fans(name, email)")
        .eq("performer_id", existing.id)
        .maybeSingle();

      let founderName: string | null = null;
      if (founderData?.fan) {
        const f = Array.isArray(founderData.fan) ? founderData.fan[0] : founderData.fan;
        if (f) {
          founderName = (f as Record<string, unknown>).name as string
            || (f as Record<string, unknown>).email as string
            || null;
        }
      }

      existingPerformerData = {
        id: existing.id,
        name: existing.name,
        slug: existing.slug,
        photo_url: existing.photo_url,
        user_relationship: relationship,
        founder_name: founderName,
      };
    }

    const response: ValidateResponse = {
      eligible: true,
      artist: {
        name: spotifyArtist.name,
        photo_url: spotifyArtist.photo_url,
        platform: "spotify",
        spotify_id: spotifyArtist.id,
        monthly_listeners: monthlyListeners,
        genres: spotifyArtist.genres,
      },
      ...(existingPerformerData && { existing_performer: existingPerformerData }),
    };
    return NextResponse.json(response);
  }

  // ── SoundCloud resolution ─────────────────────────────────────────────────

  if (platform === "soundcloud") {
    let scData: {
      username?: string;
      avatar_url?: string;
      followers_count?: number;
      permalink_url?: string;
    };

    try {
      const apiUrl = `https://api-widget.soundcloud.com/resolve?url=${encodeURIComponent(resolvedUrl)}&format=json&client_id=${SOUNDCLOUD_CLIENT_ID}`;
      const scRes = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
      if (!scRes.ok) throw new Error(`SoundCloud API ${scRes.status}`);
      scData = await scRes.json();
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch artist data from SoundCloud" },
        { status: 502 }
      );
    }

    const followerCount = scData.followers_count ?? 0;

    // Gate: reject if followers >= 100K
    if (followerCount >= 100_000) {
      const response: ValidateResponse = {
        eligible: false,
        rejection_reason: "over_threshold",
        artist: {
          name: scData.username || identifier,
          photo_url: scData.avatar_url?.replace("-large", "-t500x500") ?? null,
          platform: "soundcloud",
          soundcloud_username: identifier,
          follower_count: followerCount,
          genres: [],
        },
      };
      return NextResponse.json(response);
    }

    const artistName = scData.username || identifier;
    const existing = await findExistingPerformer(undefined, resolvedUrl, artistName);
    let existingPerformerData: ValidateResponse["existing_performer"] | undefined;

    if (existing) {
      const relationship = await getUserRelationship(fanId, existing.id);
      const { data: founderData } = await admin
        .from("founder_badges")
        .select("fan_id, fan:fans(name, email)")
        .eq("performer_id", existing.id)
        .maybeSingle();

      let founderName: string | null = null;
      if (founderData?.fan) {
        const f = Array.isArray(founderData.fan) ? founderData.fan[0] : founderData.fan;
        if (f) {
          founderName = (f as Record<string, unknown>).name as string
            || (f as Record<string, unknown>).email as string
            || null;
        }
      }

      existingPerformerData = {
        id: existing.id,
        name: existing.name,
        slug: existing.slug,
        photo_url: existing.photo_url,
        user_relationship: relationship,
        founder_name: founderName,
      };
    }

    const response: ValidateResponse = {
      eligible: true,
      artist: {
        name: artistName,
        photo_url: scData.avatar_url?.replace("-large", "-t500x500") ?? null,
        platform: "soundcloud",
        soundcloud_username: identifier,
        follower_count: followerCount,
        genres: [],
      },
      ...(existingPerformerData && { existing_performer: existingPerformerData }),
    };
    return NextResponse.json(response);
  }

  // ── Apple Music resolution ────────────────────────────────────────────────

  if (platform === "apple_music") {
    const artistName = identifier;

    // Cross-reference on Spotify by name
    let spotifyProbe;
    try {
      spotifyProbe = await probeSpotifyByName(artistName);
    } catch {
      spotifyProbe = null;
    }

    // If Spotify match found and over threshold → reject
    if (
      spotifyProbe?.monthly_listeners !== undefined &&
      spotifyProbe.monthly_listeners !== null &&
      spotifyProbe.monthly_listeners >= 1_000_000
    ) {
      const response: ValidateResponse = {
        eligible: false,
        rejection_reason: "over_threshold",
        artist: {
          name: artistName,
          photo_url: spotifyProbe.photo_url ?? null,
          platform: "apple_music",
          apple_music_url: resolvedUrl,
          spotify_id: spotifyProbe.spotify_id,
          monthly_listeners: spotifyProbe.monthly_listeners,
          genres: spotifyProbe.genres ?? [],
        },
      };
      return NextResponse.json(response);
    }

    // No Spotify match or under threshold → eligible per PRD
    const existing = await findExistingPerformer(
      spotifyProbe?.spotify_id,
      undefined,
      artistName
    );
    let existingPerformerData: ValidateResponse["existing_performer"] | undefined;

    if (existing) {
      const relationship = await getUserRelationship(fanId, existing.id);
      const { data: founderData } = await admin
        .from("founder_badges")
        .select("fan_id, fan:fans(name, email)")
        .eq("performer_id", existing.id)
        .maybeSingle();

      let founderName: string | null = null;
      if (founderData?.fan) {
        const f = Array.isArray(founderData.fan) ? founderData.fan[0] : founderData.fan;
        if (f) {
          founderName = (f as Record<string, unknown>).name as string
            || (f as Record<string, unknown>).email as string
            || null;
        }
      }

      existingPerformerData = {
        id: existing.id,
        name: existing.name,
        slug: existing.slug,
        photo_url: existing.photo_url,
        user_relationship: relationship,
        founder_name: founderName,
      };
    }

    const response: ValidateResponse = {
      eligible: true,
      artist: {
        name: artistName,
        photo_url: spotifyProbe?.photo_url ?? null,
        platform: "apple_music",
        apple_music_url: resolvedUrl,
        spotify_id: spotifyProbe?.spotify_id,
        monthly_listeners: spotifyProbe?.monthly_listeners ?? null,
        genres: spotifyProbe?.genres ?? [],
      },
      ...(existingPerformerData && { existing_performer: existingPerformerData }),
    };
    return NextResponse.json(response);
  }

  // Should never reach here
  return NextResponse.json({ eligible: false, rejection_reason: "unsupported_platform" });
}
