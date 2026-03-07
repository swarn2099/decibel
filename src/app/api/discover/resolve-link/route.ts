import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
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

function detectPlatform(
  url: string
): { platform: SupportedPlatform; identifier: string } | null {
  for (const { platform, regex } of PLATFORM_PATTERNS) {
    const match = url.match(regex);
    if (match) {
      // YouTube can match @handle or channel/id
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

async function resolveSoundCloud(
  identifier: string,
  url: string
): Promise<Partial<ResolvedArtist>> {
  try {
    const scUrl = url.startsWith("http") ? url : `https://soundcloud.com/${identifier}`;
    const apiUrl = `https://api-widget.soundcloud.com/resolve?url=${encodeURIComponent(scUrl)}&format=json&client_id=${SOUNDCLOUD_CLIENT_ID}`;
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

function resolveFromUrl(
  platform: SupportedPlatform,
  identifier: string,
  originalUrl: string
): Partial<ResolvedArtist> {
  const name = formatName(identifier);
  switch (platform) {
    case "spotify":
      return { name: formatName(originalUrl.split("/artist/")[1]?.split("?")[0]?.split("/")[0] || identifier) };
    case "ra":
      return { name, ra_url: `https://ra.co/dj/${identifier}` };
    case "instagram":
      return { name: identifier, instagram_handle: identifier };
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
  // Check by platform-specific URL/handle first
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
    // Auth check
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ resolved: false, error: "Not authenticated" } satisfies LinkResolveResponse, { status: 401 });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ resolved: false, error: "URL is required" } satisfies LinkResolveResponse, { status: 400 });
    }

    const detected = detectPlatform(url.trim());
    if (!detected) {
      return NextResponse.json({
        resolved: false,
        error: "Unsupported link. Try Spotify, SoundCloud, RA, Instagram, TikTok, or YouTube.",
      } satisfies LinkResolveResponse);
    }

    const { platform, identifier } = detected;

    // Resolve artist metadata
    let partial: Partial<ResolvedArtist>;
    if (platform === "soundcloud") {
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
    return NextResponse.json({ resolved: false, error: "Internal server error" } satisfies LinkResolveResponse, { status: 500 });
  }
}
