import "server-only";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Spotify token request failed: ${res.status} — ${errorBody}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // refresh 60s early
  };

  return cachedToken.token;
}

export interface SpotifyArtistResult {
  id: string;
  name: string;
  photo_url: string | null;
  monthly_listeners: number | null;
  genres: string[];
  spotify_url: string;
  followers: number;
}

/**
 * Scrape monthly listener count from public Spotify artist page.
 * Returns 0 if the scrape fails (treated as unknown/underground).
 */
async function scrapeMonthlyListeners(artistId: string): Promise<number> {
  try {
    const res = await fetch(`https://open.spotify.com/artist/${artistId}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return 0;
    const html = await res.text();
    const match = html.match(/([\d,]+)\s*monthly listeners/);
    if (!match) return 0;
    return parseInt(match[1].replace(/,/g, ""), 10) || 0;
  } catch {
    return 0;
  }
}

export async function searchSpotifyArtists(
  query: string,
  limit = 10
): Promise<SpotifyArtistResult[]> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    q: query,
    type: "artist",
    limit: String(limit),
  });

  const res = await fetch(
    `https://api.spotify.com/v1/search?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Spotify search failed: ${res.status} — ${errorBody}`);
  }

  const data = await res.json();
  const artists = data.artists?.items || [];
  if (artists.length === 0) return [];

  // Spotify Client Credentials no longer returns followers/popularity.
  // Scrape monthly listeners from public pages in parallel to filter mainstream.
  const listenerResults = await Promise.allSettled(
    artists.map((a: { id: string }) => scrapeMonthlyListeners(a.id))
  );

  return artists.map(
    (a: {
      id: string;
      name: string;
      images?: { url: string }[];
      genres?: string[];
      external_urls?: { spotify?: string };
    },
    i: number) => ({
      id: a.id,
      name: a.name,
      photo_url: a.images?.[0]?.url || null,
      monthly_listeners:
        listenerResults[i].status === "fulfilled"
          ? listenerResults[i].value
          : null,
      genres: a.genres || [],
      spotify_url: a.external_urls?.spotify || `https://open.spotify.com/artist/${a.id}`,
      followers:
        listenerResults[i].status === "fulfilled"
          ? listenerResults[i].value
          : 0,
    })
  );
}

export async function getSpotifyArtist(
  artistId: string
): Promise<SpotifyArtistResult | null> {
  const token = await getAccessToken();

  const res = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  if (!res.ok) return null;

  const a = await res.json();

  return {
    id: a.id,
    name: a.name,
    photo_url: a.images?.[0]?.url || null,
    monthly_listeners: null,
    genres: a.genres || [],
    spotify_url:
      a.external_urls?.spotify ||
      `https://open.spotify.com/artist/${a.id}`,
    followers: a.followers?.total || 0,
  };
}
