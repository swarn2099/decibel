import "server-only";

export interface DeezerArtistResult {
  id: string;
  name: string;
  photo_url: string | null;
  deezer_url: string;
  fans: number;
  nb_album: number;
}

interface DeezerArtistRaw {
  id: number;
  name: string;
  link: string;
  picture_medium: string;
  picture_big: string;
  nb_album: number;
  nb_fan: number;
  type: string;
}

/**
 * Search Deezer for artists. Free API, no auth required.
 * Returns fan counts (nb_fan) which we use for the <1M underground filter.
 */
export async function searchDeezerArtists(
  query: string,
  limit = 10
): Promise<DeezerArtistResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });

  const res = await fetch(
    `https://api.deezer.com/search/artist?${params.toString()}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Deezer search failed: ${res.status}`);
  }

  const data = await res.json();
  const artists: DeezerArtistRaw[] = data.data || [];

  return artists.map((a) => ({
    id: String(a.id),
    name: a.name,
    photo_url: a.picture_big || a.picture_medium || null,
    deezer_url: a.link,
    fans: a.nb_fan,
    nb_album: a.nb_album,
  }));
}
