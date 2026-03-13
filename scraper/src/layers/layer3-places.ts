/**
 * Layer 3: Nominatim reverse geocode for city + venue name enrichment.
 * Used to provide city context to Layer 2 API queries when Layer 1 misses.
 *
 * Non-blocking: errors and rate limits return { city: null, venueName: null }.
 */

export interface PlaceContext {
  city: string | null;
  venueName: string | null;
}

/**
 * Reverse geocode lat/lng to city name + optional venue name via Nominatim.
 * Always resolves — never throws.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<PlaceContext> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Decibel/1.0 (decible.live)',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 429) {
      console.warn('[layer3] Nominatim rate limited (429) — returning null context');
      return { city: null, venueName: null };
    }

    if (!res.ok) {
      console.warn(`[layer3] Nominatim HTTP ${res.status} — returning null context`);
      return { city: null, venueName: null };
    }

    const data = await res.json();

    const address = data?.address ?? {};
    const city =
      address.city ??
      address.town ??
      address.village ??
      address.county ??
      null;

    // Nominatim "name" field sometimes contains the venue/building name
    const venueName = data?.name && typeof data.name === 'string' && data.name.trim()
      ? data.name.trim()
      : null;

    console.log(`[layer3] Reverse geocode: city="${city}" venue="${venueName}"`);

    return { city, venueName };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('[layer3] Nominatim timed out — returning null context');
    } else {
      console.warn('[layer3] Nominatim error:', err?.message ?? err);
    }
    return { city: null, venueName: null };
  }
}
