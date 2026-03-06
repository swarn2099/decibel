/**
 * Geocodes venue coordinates using Nominatim (OpenStreetMap).
 * Replaces default Chicago center coords with real venue locations.
 * Run: npx tsx scripts/scrapers/geocode-venues.ts
 */
import { getSupabase, log, logError } from "./utils";

const DEFAULT_LAT = 41.8781;
const DEFAULT_LNG = -87.6298;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitterCoords(lat: number, lng: number): { lat: number; lng: number } {
  const jitterLat = (Math.random() - 0.5) * 0.04; // +/- 0.02 degrees
  const jitterLng = (Math.random() - 0.5) * 0.04;
  return { lat: lat + jitterLat, lng: lng + jitterLng };
}

async function geocode(
  venueName: string
): Promise<{ lat: number; lng: number } | null> {
  const query = encodeURIComponent(`${venueName}, Chicago, IL`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Decibel-App/1.0 (venue geocoding)",
      },
    });

    if (!res.ok) {
      logError("geocode", `HTTP ${res.status} for ${venueName}`);
      return null;
    }

    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (err) {
    logError("geocode", `Failed to geocode ${venueName}`, err);
    return null;
  }
}

async function main() {
  const supabase = getSupabase();

  // Get venues with default placeholder coordinates
  const { data: venues, error } = await supabase
    .from("venues")
    .select("id, name, slug, latitude, longitude")
    .eq("latitude", DEFAULT_LAT)
    .eq("longitude", DEFAULT_LNG);

  if (error) {
    logError("geocode", "Failed to fetch venues", error);
    return;
  }

  if (!venues || venues.length === 0) {
    log("geocode", "No venues with default coordinates found. All geocoded!");
    return;
  }

  log("geocode", `Found ${venues.length} venues to geocode`);

  let geocoded = 0;
  let jittered = 0;

  for (const venue of venues) {
    // Rate limit: 1 req/sec per Nominatim policy
    await sleep(1100);

    const coords = await geocode(venue.name);

    if (coords) {
      const { error: updateErr } = await supabase
        .from("venues")
        .update({ latitude: coords.lat, longitude: coords.lng })
        .eq("id", venue.id);

      if (updateErr) {
        logError("geocode", `Failed to update ${venue.name}`, updateErr);
      } else {
        log("geocode", `Geocoded ${venue.name}: ${coords.lat}, ${coords.lng}`);
        geocoded++;
      }
    } else {
      // Jitter the default coords so venues don't stack
      const jCoords = jitterCoords(DEFAULT_LAT, DEFAULT_LNG);
      const { error: updateErr } = await supabase
        .from("venues")
        .update({ latitude: jCoords.lat, longitude: jCoords.lng })
        .eq("id", venue.id);

      if (updateErr) {
        logError("geocode", `Failed to jitter ${venue.name}`, updateErr);
      } else {
        log(
          "geocode",
          `Could not geocode ${venue.name}, using jittered default`
        );
        jittered++;
      }
    }
  }

  log(
    "geocode",
    `Done! Geocoded: ${geocoded}, Jittered: ${jittered}, Total: ${venues.length}`
  );
}

main().catch(console.error);
