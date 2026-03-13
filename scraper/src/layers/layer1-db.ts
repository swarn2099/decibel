import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { ScrapeResult, ScrapedArtist } from '../types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Haversine distance in meters between two lat/lng pairs.
 */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Layer 1: DB venue + event lookup by coordinates.
 *
 * 1. Fetch all venues (small set ~200 rows)
 * 2. Filter by Haversine <= 200m
 * 3. For each nearby venue, query events + performers for localDate
 * 4. Also check user_tagged_events for crowdsourced performers
 * 5. Return ScrapeResult with confidence 'high', or null if no hit
 */
export async function queryDB(lat: number, lng: number, localDate: string): Promise<ScrapeResult | null> {
  try {
    // Step 1: Fetch all venues
    const { data: venues, error: venueErr } = await supabase
      .from('venues')
      .select('id, name, latitude, longitude');

    if (venueErr) {
      console.error('[layer1] Error fetching venues:', venueErr.message);
      return null;
    }

    if (!venues || venues.length === 0) {
      console.log('[layer1] No venues in DB');
      return null;
    }

    // Step 2: Filter by distance <= 200m
    const nearbyVenues = venues.filter((v) => {
      if (v.latitude == null || v.longitude == null) return false;
      return haversineMeters(lat, lng, v.latitude, v.longitude) <= 200;
    });

    if (nearbyVenues.length === 0) {
      console.log('[layer1] No venues within 200m');
      return null;
    }

    console.log(`[layer1] Found ${nearbyVenues.length} venue(s) within 200m: ${nearbyVenues.map((v) => v.name).join(', ')}`);

    // Use the closest venue as the primary match
    const closestVenue = nearbyVenues.reduce((closest, v) => {
      const d = haversineMeters(lat, lng, v.latitude, v.longitude);
      const dc = haversineMeters(lat, lng, closest.latitude, closest.longitude);
      return d < dc ? v : closest;
    });

    // Step 3: Query events for today joined with performers
    const { data: eventArtists, error: evErr } = await supabase
      .from('event_artists')
      .select(`
        performer_id,
        performers (id, name, soundcloud_url, spotify_url, apple_music_url, ra_url)
      `)
      .eq('venue_id', closestVenue.id)
      .eq('event_date', localDate);

    // Also try events table (older schema)
    const { data: events, error: eventsErr } = await supabase
      .from('events')
      .select(`
        performer_id,
        performers (id, name, soundcloud_url, spotify_url, apple_music_url, ra_url)
      `)
      .eq('venue_id', closestVenue.id)
      .eq('event_date', localDate);

    if (evErr && eventsErr) {
      console.error('[layer1] Error querying events:', evErr?.message, eventsErr?.message);
    }

    // Step 4: Check user_tagged_events for crowdsourced data
    const { data: taggedEvents } = await supabase
      .from('user_tagged_events')
      .select('performer_name, platform_url')
      .eq('venue_id', closestVenue.id)
      .eq('event_date', localDate);

    // Build artist list from events table(s)
    const artists: ScrapedArtist[] = [];
    const seenIds = new Set<string>();

    // From event_artists table
    for (const ea of eventArtists || []) {
      const p = (ea as any).performers;
      if (!p || seenIds.has(p.id)) continue;
      seenIds.add(p.id);
      artists.push({
        name: p.name,
        performer_id: p.id,
        platform_url: p.soundcloud_url || p.spotify_url || p.apple_music_url || p.ra_url || null,
      });
    }

    // From events table (fallback/legacy schema)
    for (const ev of events || []) {
      const p = (ev as any).performers;
      if (!p || seenIds.has(p.id)) continue;
      seenIds.add(p.id);
      artists.push({
        name: p.name,
        performer_id: p.id,
        platform_url: p.soundcloud_url || p.spotify_url || p.apple_music_url || p.ra_url || null,
      });
    }

    // From user_tagged_events (crowdsourced, no performer_id)
    for (const te of taggedEvents || []) {
      if (!te.performer_name) continue;
      artists.push({
        name: te.performer_name,
        performer_id: null,
        platform_url: te.platform_url || null,
      });
    }

    if (artists.length === 0) {
      console.log(`[layer1] Venue "${closestVenue.name}" found but no events for ${localDate}`);
      return null;
    }

    console.log(`[layer1] DB hit: venue="${closestVenue.name}" artists=${artists.length}`);

    return {
      confidence: 'high',
      venue_name: closestVenue.name,
      venue_id: closestVenue.id,
      artists,
      source: 'db',
    };
  } catch (err) {
    console.error('[layer1] Unexpected error:', err);
    return null;
  }
}
