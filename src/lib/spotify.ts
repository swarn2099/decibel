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

export async function searchSpotifyArtists(
  query: string,
  limit = 5
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

  return artists.map(
    (a: {
      id: string;
      name: string;
      images?: { url: string }[];
      genres?: string[];
      external_urls?: { spotify?: string };
      followers?: { total?: number };
    }) => ({
      id: a.id,
      name: a.name,
      photo_url: a.images?.[0]?.url || null,
      monthly_listeners: null, // not available via search, fetched separately
      genres: a.genres || [],
      spotify_url: a.external_urls?.spotify || `https://open.spotify.com/artist/${a.id}`,
      followers: a.followers?.total || 0,
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
