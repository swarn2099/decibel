import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

let cachedToken: { token: string; expiresAt: number; type: "user" | "client" } | null = null;

/**
 * Get a Spotify access token. Prefers user OAuth (via stored refresh token)
 * which returns full artist data (followers, genres, popularity).
 * Falls back to Client Credentials if no refresh token is available.
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const basicAuth = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

  // Try user OAuth via stored refresh token first
  try {
    const admin = createSupabaseAdmin();
    const { data: tokenRow } = await admin
      .from("spotify_tokens")
      .select("refresh_token")
      .eq("id", 1)
      .maybeSingle();

    if (tokenRow?.refresh_token) {
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: basicAuth,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenRow.refresh_token,
        }),
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        cachedToken = {
          token: data.access_token,
          expiresAt: Date.now() + (data.expires_in - 60) * 1000,
          type: "user",
        };

        // If Spotify rotated the refresh token, save the new one
        if (data.refresh_token && data.refresh_token !== tokenRow.refresh_token) {
          await admin.from("spotify_tokens").upsert(
            { id: 1, refresh_token: data.refresh_token, updated_at: new Date().toISOString() },
            { onConflict: "id" }
          );
        }

        return cachedToken.token;
      } else {
        const errBody = await res.text();
        console.error("[spotify] Refresh token exchange failed:", res.status, errBody);
      }
    } else {
      console.warn("[spotify] No refresh token in spotify_tokens table");
    }
  } catch (err) {
    console.error("[spotify] Error during refresh token flow:", err);
  }

  // Fallback: Client Credentials (no followers/genres in responses)
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuth,
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
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    type: "client",
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
 * Returns null if the scrape fails — null means "unverified", NOT "eligible".
 * Callers must treat null as unverified, never as 0/underground.
 */
export async function scrapeMonthlyListeners(artistId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://open.spotify.com/artist/${artistId}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/([\d,]+)\s*monthly listeners/);
    if (!match) return null;
    return parseInt(match[1].replace(/,/g, ""), 10) || null;
  } catch {
    return null;
  }
}

export async function searchSpotifyArtists(
  query: string,
  limit = 10,
  tokenOverride?: string
): Promise<SpotifyArtistResult[]> {
  const token = tokenOverride || await getAccessToken();

  const params = new URLSearchParams({
    q: query,
    type: "artist",
    limit: String(limit),
  });

  let res = await fetch(
    `https://api.spotify.com/v1/search?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  // If cached token failed, clear cache and retry with a fresh one
  if (!res.ok && !tokenOverride && cachedToken) {
    console.warn(`[spotify] Search failed with cached ${cachedToken.type} token (${res.status}), retrying with fresh token`);
    cachedToken = null;
    const freshToken = await getAccessToken();
    res = await fetch(
      `https://api.spotify.com/v1/search?${params.toString()}`,
      { headers: { Authorization: `Bearer ${freshToken}` }, cache: "no-store" }
    );
  }

  if (!res.ok) {
    const errorBody = await res.text();
    cachedToken = null; // Clear bad cache
    throw new Error(`Spotify search failed: ${res.status} — ${errorBody}`);
  }

  const data = await res.json();
  const artists = data.artists?.items || [];
  if (artists.length === 0) return [];

  // Spotify Dev Mode apps don't get followers/genres/popularity from ANY token type.
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
      followers?: { total?: number };
    },
    i: number) => {
      const scraped = listenerResults[i].status === "fulfilled" ? listenerResults[i].value : null;
      // Use API followers if available, otherwise use scraped monthly listeners
      const apiFollowers = a.followers?.total ?? 0;
      return {
        id: a.id,
        name: a.name,
        photo_url: a.images?.[0]?.url || null,
        monthly_listeners: scraped,
        genres: a.genres || [],
        spotify_url: a.external_urls?.spotify || `https://open.spotify.com/artist/${a.id}`,
        followers: apiFollowers > 0 ? apiFollowers : (scraped ?? 0),
      };
    }
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
    followers: a.followers?.total ?? 0,
  };
}
