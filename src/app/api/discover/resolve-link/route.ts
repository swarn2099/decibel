import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { searchSpotifyArtists } from "@/lib/spotify";
import type {
  SupportedPlatform,
  ResolvedArtist,
  LinkResolveResponse,
} from "@/lib/types/discovery";

const SOUNDCLOUD_CLIENT_ID = "nIjtjiYnjkOhMyh5xrbqEW12DxeJVnic";

const PLATFORM_PATTERNS: { platform: SupportedPlatform; regex: RegExp }[] = [
  { platform: "spotify", regex: /open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/i },
  { platform: "soundcloud", regex: /soundcloud\.com\/([a-zA-Z0-9_-]+)\/?/i },
  { platform: "ra", regex: /ra\.co\/dj\/([a-zA-Z0-9_-]+)\/?/i },
  { platform: "instagram", regex: /instagram\.com\/([a-zA-Z0-9._]+)\/?/i },
  { platform: "tiktok", regex: /tiktok\.com\/@([a-zA-Z0-9._]+)\/?/i },
  {
    platform: "youtube",
    regex: /youtube\.com\/(?:@([a-zA-Z0-9._-]+)|channel\/([a-zA-Z0-9_-]+))\/?/i,
  },
];

/* ── Link-in-bio service detection ── */
const LINK_IN_BIO_PATTERNS = [
  /linktr\.ee/i,
  /beacons\.ai/i,
  /solo\.to/i,
  /bio\.site/i,
  /hoo\.be/i,
  /direct\.me/i,
  /lnk\.to/i,
];

function isLinkInBio(url: string): boolean {
  return LINK_IN_BIO_PATTERNS.some((p) => p.test(url));
}

function detectPlatform(
  url: string
): { platform: SupportedPlatform; identifier: string } | null {
  for (const { platform, regex } of PLATFORM_PATTERNS) {
    const match = url.match(regex);
    if (match) {
      const identifier = match[1] || match[2];
      if (identifier) return { platform, identifier };
    }
  }
  return null;
}

function formatName(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/* ── Scrape Instagram profile for name, photo, bio link ── */
async function scrapeInstagramProfile(
  identifier: string
): Promise<{ name?: string; photo_url?: string; bio_link?: string }> {
  try {
    const res = await fetch(`https://www.instagram.com/${identifier}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return {};

    const html = await res.text();

    // Extract og:title — format: "Name (@handle) • Instagram photos and videos"
    let name: string | undefined;
    const titleMatch = html.match(
      /<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i
    );
    if (titleMatch) {
      const cleaned = titleMatch[1].match(/^(.+?)\s*\(@/);
      if (cleaned) name = cleaned[1].trim();
    }

    // Extract og:image (profile pic)
    let photo_url: string | undefined;
    const imageMatch = html.match(
      /<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i
    );
    if (imageMatch) photo_url = imageMatch[1];

    // Try to find external URL (bio link) from the page data
    let bio_link: string | undefined;
    // Instagram sometimes includes external_url in JSON data within script tags
    const extUrlMatch = html.match(/"external_url"\s*:\s*"(https?:[^"]+)"/);
    if (extUrlMatch) {
      bio_link = extUrlMatch[1]
        .replace(/\\u0026/g, "&")
        .replace(/\\\//g, "/");
    }

    // Also check og:description for URLs
    if (!bio_link) {
      const descMatch = html.match(
        /<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i
      );
      if (descMatch) {
        const urlInDesc = descMatch[1].match(
          /https?:\/\/[^\s"<]+/
        );
        if (urlInDesc) bio_link = urlInDesc[0];
      }
    }

    return { name, photo_url, bio_link };
  } catch {
    return {};
  }
}

/* ── Scrape link-in-bio page (Linktree, Beacons, etc.) for social links ── */
async function scrapeLinkInBio(
  url: string
): Promise<{
  soundcloud_url?: string;
  spotify_url?: string;
  spotify_id?: string;
  ra_url?: string;
}> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    if (!res.ok) return {};

    const html = await res.text();
    const links: string[] = [];

    // Extract all href values from the page
    const hrefMatches = html.matchAll(/href="(https?:\/\/[^"]+)"/gi);
    for (const m of hrefMatches) {
      links.push(m[1]);
    }

    // Also check for URLs in JSON data (Next.js __NEXT_DATA__, etc.)
    const jsonUrls = html.matchAll(/"url"\s*:\s*"(https?:\/\/[^"]+)"/gi);
    for (const m of jsonUrls) {
      links.push(m[1].replace(/\\\//g, "/").replace(/\\u0026/g, "&"));
    }

    const result: {
      soundcloud_url?: string;
      spotify_url?: string;
      spotify_id?: string;
      ra_url?: string;
    } = {};

    for (const link of links) {
      if (!result.soundcloud_url && /soundcloud\.com\/[a-zA-Z0-9_-]+/i.test(link)) {
        result.soundcloud_url = link.split("?")[0];
      }
      if (!result.spotify_url && /open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/i.test(link)) {
        result.spotify_url = link.split("?")[0];
        const idMatch = link.match(/\/artist\/([a-zA-Z0-9]+)/);
        if (idMatch) result.spotify_id = idMatch[1];
      }
      if (!result.ra_url && /ra\.co\/dj\/[a-zA-Z0-9_-]+/i.test(link)) {
        result.ra_url = link.split("?")[0];
      }
    }

    return result;
  } catch {
    return {};
  }
}

/* ── Search SoundCloud for artist by name ── */
async function searchSoundCloud(
  query: string
): Promise<{ soundcloud_url?: string; name?: string; photo_url?: string }> {
  try {
    const apiUrl = `https://api-v2.soundcloud.com/search/users?q=${encodeURIComponent(
      query
    )}&client_id=${SOUNDCLOUD_CLIENT_ID}&limit=5`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    const data = await res.json();
    const users = data.collection || [];
    if (users.length === 0) return {};

    // Pick best match — prefer most followers among close name matches
    const queryNorm = query.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match =
      users.find(
        (u: Record<string, unknown>) =>
          (u.username as string).toLowerCase().replace(/[^a-z0-9]/g, "") === queryNorm
      ) ||
      users.sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) =>
          ((b.followers_count as number) || 0) - ((a.followers_count as number) || 0)
      )[0];

    return {
      soundcloud_url: (match.permalink_url as string) || `https://soundcloud.com/${match.permalink}`,
      name: (match.username as string) || undefined,
      photo_url: (match.avatar_url as string)?.replace("-large", "-t500x500"),
    };
  } catch {
    return {};
  }
}

/* ── Search Spotify for artist by name (strict match only) ── */
async function probeSpotify(
  name: string
): Promise<{
  spotify_id?: string;
  spotify_url?: string;
  photo_url?: string;
  genres?: string[];
  followers?: number;
}> {
  try {
    const results = await searchSpotifyArtists(name, 5);
    if (!results || results.length === 0) return {};

    // Only return if there's an exact normalized name match
    const nameLower = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = results.find(
      (r) => r.name.toLowerCase().replace(/[^a-z0-9]/g, "") === nameLower
    );

    // No exact match = don't guess (avoids false positives)
    if (!match) return {};

    return {
      spotify_id: match.id,
      spotify_url: match.spotify_url,
      photo_url: match.photo_url || undefined,
      genres: match.genres,
      followers: match.followers,
    };
  } catch {
    return {};
  }
}

/* ── Resolve SoundCloud (standalone) ── */
async function resolveSoundCloud(
  identifier: string,
  url: string
): Promise<Partial<ResolvedArtist>> {
  try {
    const scUrl = url.startsWith("http")
      ? url
      : `https://soundcloud.com/${identifier}`;
    const apiUrl = `https://api-widget.soundcloud.com/resolve?url=${encodeURIComponent(
      scUrl
    )}&format=json&client_id=${SOUNDCLOUD_CLIENT_ID}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`SoundCloud API ${res.status}`);
    const data = await res.json();
    return {
      name: data.username || formatName(identifier),
      photo_url: data.avatar_url?.replace("-large", "-t500x500"),
      soundcloud_url: data.permalink_url || scUrl,
    };
  } catch {
    return {
      name: formatName(identifier),
      soundcloud_url: `https://soundcloud.com/${identifier}`,
    };
  }
}

/* ── Instagram resolution: scrape IG + follow bio links + probe SC/Spotify ── */
async function resolveInstagram(
  identifier: string,
  originalUrl: string
): Promise<Partial<ResolvedArtist>> {
  const result: Partial<ResolvedArtist> = {
    name: identifier,
    instagram_handle: identifier,
  };

  // 1. Scrape Instagram profile (best effort)
  const igData = await scrapeInstagramProfile(identifier);
  if (igData.name) result.name = igData.name;
  if (igData.photo_url) result.photo_url = igData.photo_url;

  // 2. If bio has a link-in-bio URL, scrape it for social links
  if (igData.bio_link && isLinkInBio(igData.bio_link)) {
    const bioLinks = await scrapeLinkInBio(igData.bio_link);
    if (bioLinks.soundcloud_url) result.soundcloud_url = bioLinks.soundcloud_url;
    if (bioLinks.spotify_url) result.spotify_url = bioLinks.spotify_url;
    if (bioLinks.spotify_id) result.spotify_id = bioLinks.spotify_id;
    if (bioLinks.ra_url) result.ra_url = bioLinks.ra_url;
  } else if (igData.bio_link) {
    // Bio link might be a direct SoundCloud/Spotify/RA link
    const detected = detectPlatform(igData.bio_link);
    if (detected?.platform === "soundcloud") {
      result.soundcloud_url = igData.bio_link.split("?")[0];
    } else if (detected?.platform === "spotify") {
      result.spotify_url = igData.bio_link.split("?")[0];
      const idMatch = igData.bio_link.match(/\/artist\/([a-zA-Z0-9]+)/);
      if (idMatch) result.spotify_id = idMatch[1];
    } else if (detected?.platform === "ra") {
      result.ra_url = igData.bio_link.split("?")[0];
    }
  }

  // 3. Search SoundCloud for the artist name
  if (!result.soundcloud_url) {
    // Use the best name we have — extracted from IG or formatted from handle
    const searchName = result.name !== identifier ? result.name! : formatName(identifier.replace(/dj$/i, "").replace(/^dj/i, ""));
    const scData = await searchSoundCloud(searchName);
    if (scData.soundcloud_url) {
      result.soundcloud_url = scData.soundcloud_url;
      if (!result.photo_url && scData.photo_url) result.photo_url = scData.photo_url;
      if (result.name === identifier && scData.name) result.name = scData.name;
    }
  }

  // 4. Search Spotify for the artist name
  if (!result.spotify_id) {
    const artistName = result.name !== identifier ? result.name! : formatName(identifier);
    const spotifyData = await probeSpotify(artistName);
    if (spotifyData.spotify_id) {
      result.spotify_id = spotifyData.spotify_id;
      result.spotify_url = spotifyData.spotify_url;
      if (!result.photo_url && spotifyData.photo_url) result.photo_url = spotifyData.photo_url;
      if (spotifyData.genres?.length) result.genres = spotifyData.genres;
    }
  }

  return result;
}

function resolveFromUrl(
  platform: SupportedPlatform,
  identifier: string,
  originalUrl: string
): Partial<ResolvedArtist> {
  const name = formatName(identifier);
  switch (platform) {
    case "spotify":
      return {
        name: formatName(
          originalUrl.split("/artist/")[1]?.split("?")[0]?.split("/")[0] ||
            identifier
        ),
      };
    case "ra":
      return { name, ra_url: `https://ra.co/dj/${identifier}` };
    case "tiktok":
      return { name: identifier };
    case "youtube":
      return { name };
    default:
      return { name };
  }
}

async function findExistingPerformer(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  artist: ResolvedArtist
) {
  // Check by spotify_id first (most precise)
  if (artist.spotify_id) {
    const { data } = await supabase
      .from("performers")
      .select("id, name, slug, photo_url")
      .eq("spotify_id", artist.spotify_id)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  if (artist.soundcloud_url) {
    const { data } = await supabase
      .from("performers")
      .select("id, name, slug, photo_url")
      .eq("soundcloud_url", artist.soundcloud_url)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  if (artist.ra_url) {
    const { data } = await supabase
      .from("performers")
      .select("id, name, slug, photo_url")
      .eq("ra_url", artist.ra_url)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  if (artist.instagram_handle) {
    const { data } = await supabase
      .from("performers")
      .select("id, name, slug, photo_url")
      .eq("instagram_handle", artist.instagram_handle)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  // Fallback: case-insensitive name match
  const { data } = await supabase
    .from("performers")
    .select("id, name, slug, photo_url")
    .ilike("name", artist.name)
    .limit(1)
    .maybeSingle();
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
        { resolved: false, error: "Not authenticated" } satisfies LinkResolveResponse,
        { status: 401 }
      );
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { resolved: false, error: "URL is required" } satisfies LinkResolveResponse,
        { status: 400 }
      );
    }

    const detected = detectPlatform(url.trim());
    if (!detected) {
      return NextResponse.json({
        resolved: false,
        error:
          "Unsupported link. Try Spotify, SoundCloud, RA, Instagram, TikTok, or YouTube.",
      } satisfies LinkResolveResponse);
    }

    const { platform, identifier } = detected;

    // Resolve artist metadata (Instagram gets full enrichment)
    let partial: Partial<ResolvedArtist>;
    if (platform === "instagram") {
      partial = await resolveInstagram(identifier, url.trim());
    } else if (platform === "soundcloud") {
      partial = await resolveSoundCloud(identifier, url.trim());
    } else {
      partial = resolveFromUrl(platform, identifier, url.trim());
    }

    const artist: ResolvedArtist = {
      name: partial.name || formatName(identifier),
      platform,
      platform_url: url.trim(),
      photo_url: partial.photo_url,
      soundcloud_url: partial.soundcloud_url,
      ra_url: partial.ra_url,
      instagram_handle: partial.instagram_handle,
      spotify_id: partial.spotify_id,
      spotify_url: partial.spotify_url,
      genres: partial.genres,
    };

    // Check if performer exists in DB
    const supabaseAdmin = createSupabaseAdmin();
    const existing = await findExistingPerformer(supabaseAdmin, artist);

    const response: LinkResolveResponse = {
      resolved: true,
      artist,
      existing_performer: existing || undefined,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { resolved: false, error: "Internal server error" } satisfies LinkResolveResponse,
      { status: 500 }
    );
  }
}
