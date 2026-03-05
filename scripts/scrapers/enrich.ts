import { getSupabase, log, logError } from "./utils";

export async function enrichProfiles() {
  const supabase = getSupabase();

  // Get all performers
  const { data: performers } = await supabase
    .from("performers")
    .select("id, name, photo_url, genres, soundcloud_url, instagram_handle");

  if (!performers || performers.length === 0) {
    log("enrich", "No performers found");
    return;
  }

  log("enrich", `Enriching ${performers.length} performers...`);

  let enriched = 0;

  for (const performer of performers) {
    const updates: Record<string, unknown> = {};

    // Enrich genres from scraped data if empty
    if (!performer.genres || performer.genres.length === 0) {
      const { data: scraped } = await supabase
        .from("scraped_profiles")
        .select("raw_data, source")
        .eq("performer_id", performer.id);

      if (scraped) {
        const genres = new Set<string>();
        for (const s of scraped) {
          const raw = s.raw_data as Record<string, unknown>;
          if (raw.genre) genres.add(String(raw.genre));
          if (raw.genres && Array.isArray(raw.genres)) {
            raw.genres.forEach((g: unknown) => genres.add(String(g)));
          }
        }
        if (genres.size > 0) {
          updates.genres = Array.from(genres);
        }
      }
    }

    // Count gigs from events table
    const { count: gigCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("performer_id", performer.id);

    if (gigCount && gigCount > 0) {
      updates.follower_count = Math.max(performer.genres?.length || 0, gigCount);
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from("performers")
        .update(updates)
        .eq("id", performer.id);

      if (error) {
        logError("enrich", `Failed to update ${performer.name}`, error);
      } else {
        enriched++;
      }
    }
  }

  log("enrich", `Done. Enriched ${enriched} performers.`);
}

if (require.main === module) {
  enrichProfiles().catch(console.error);
}
