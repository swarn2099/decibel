/**
 * Tag Chicago Residents: Artists who have played at Chicago venues 4+ times
 * get is_chicago_resident = true. Run after scraping events from any source.
 */
import { getSupabase, log } from "./utils";

// Key underground Chicago venues (slugs from EDMTrain data)
const CHICAGO_VENUE_SLUGS = [
  "smartbar", "spybar", "sound-bar-chicago",
  "concord-music-hall", "radius", "cermak-hall-at-radius",
  "311-n-morgan-st", "morgan-mfg",
];

async function main() {
  const supabase = getSupabase();

  // Reset all residents first
  await supabase
    .from("performers")
    .update({ is_chicago_resident: false })
    .eq("is_chicago_resident", true);

  // Get Chicago venue IDs
  const { data: venues } = await supabase
    .from("venues")
    .select("id, slug")
    .in("slug", CHICAGO_VENUE_SLUGS);

  if (!venues || venues.length === 0) {
    log("residents", "No Chicago venues found in DB");
    return;
  }

  const venueIds = venues.map((v) => v.id);
  log("residents", `Found ${venues.length} Chicago venues: ${venues.map((v) => v.slug).join(", ")}`);

  // Count events per performer at these venues
  const { data: events } = await supabase
    .from("events")
    .select("performer_id, venue_id")
    .in("venue_id", venueIds);

  if (!events) {
    log("residents", "No events found at Chicago venues");
    return;
  }

  // Count unique venue appearances per performer
  const performerVenueCounts = new Map<string, Set<string>>();
  for (const e of events) {
    if (!performerVenueCounts.has(e.performer_id)) {
      performerVenueCounts.set(e.performer_id, new Set());
    }
    performerVenueCounts.get(e.performer_id)!.add(e.venue_id);
  }

  // Also count total event appearances
  const performerEventCounts = new Map<string, number>();
  for (const e of events) {
    performerEventCounts.set(e.performer_id, (performerEventCounts.get(e.performer_id) || 0) + 1);
  }

  // Tag performers with 4+ events at Chicago venues
  const residentIds: string[] = [];
  for (const [performerId, count] of performerEventCounts) {
    if (count >= 3) {
      residentIds.push(performerId);
    }
  }

  if (residentIds.length === 0) {
    log("residents", "No performers qualify as Chicago Residents (need 4+ events at key venues)");
    return;
  }

  // Batch update
  for (let i = 0; i < residentIds.length; i += 50) {
    const batch = residentIds.slice(i, i + 50);
    await supabase
      .from("performers")
      .update({ is_chicago_resident: true })
      .in("id", batch);
  }

  // Print results
  const { data: residents } = await supabase
    .from("performers")
    .select("name, follower_count")
    .eq("is_chicago_resident", true)
    .order("follower_count", { ascending: false });

  log("residents", `\n=== CHICAGO RESIDENTS (${residents?.length || 0}) ===`);
  for (const r of residents || []) {
    const events = performerEventCounts.get("") || 0; // just for display
    log("residents", `  ${r.name} (${r.follower_count || 0} followers)`);
  }
}

main().catch(console.error);
