/**
 * Enriches performers using SoundCloud's widget API (no auth needed).
 * Fetches avatar, bio, follower count for all performers with soundcloud_url.
 */
import { getSupabase, log, logError } from "./utils";

const CLIENT_ID = "nIjtjiYnjkOhMyh5xrbqEW12DxeJVnic";
const API_BASE = "https://api-widget.soundcloud.com";

interface SCUser {
  avatar_url?: string;
  description?: string;
  followers_count?: number;
  full_name?: string;
  username?: string;
  city?: string;
}

async function resolveUser(scUrl: string): Promise<SCUser | null> {
  try {
    const url = `${API_BASE}/resolve?url=${encodeURIComponent(scUrl)}&format=json&client_id=${CLIENT_ID}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.json() as SCUser;
  } catch {
    return null;
  }
}

async function main() {
  const supabase = getSupabase();

  const { data: performers } = await supabase
    .from("performers")
    .select("id, name, soundcloud_url, photo_url, bio, follower_count")
    .not("soundcloud_url", "is", null)
    .order("name");

  if (!performers || performers.length === 0) {
    log("enrich", "No performers with SC URLs");
    return;
  }

  log("enrich", `Enriching ${performers.length} performers via SC widget API`);

  let enriched = 0;
  let photos = 0;
  let bios = 0;

  for (let i = 0; i < performers.length; i++) {
    const p = performers[i];
    const user = await resolveUser(p.soundcloud_url!);

    if (!user) {
      if ((i + 1) % 50 === 0) log("enrich", `  Progress: ${i + 1}/${performers.length}`);
      continue;
    }

    const updates: Record<string, unknown> = {};

    // Avatar — skip default/placeholder
    if (
      user.avatar_url &&
      !user.avatar_url.includes("default_avatar") &&
      !user.avatar_url.includes("fb_placeholder")
    ) {
      const hiRes = user.avatar_url.replace("-large", "-t500x500");
      updates.photo_url = hiRes;
      photos++;
    }

    // Bio
    if (user.description && user.description.length > 5 && !p.bio) {
      updates.bio = user.description.slice(0, 500);
      bios++;
    }

    // Followers — only update if SC has more
    if (user.followers_count && user.followers_count > (p.follower_count || 0)) {
      updates.follower_count = user.followers_count;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase.from("performers").update(updates).eq("id", p.id);
      enriched++;
    }

    if ((i + 1) % 50 === 0) {
      log("enrich", `  Progress: ${i + 1}/${performers.length} (${enriched} enriched, ${photos} photos)`);
    }

    // Light rate limit
    await new Promise((r) => setTimeout(r, 100));
  }

  log("enrich", `\n=== DONE ===`);
  log("enrich", `Enriched: ${enriched}/${performers.length}`);
  log("enrich", `Photos: ${photos}, Bios: ${bios}`);

  // Final stats
  const { data: final } = await supabase
    .from("performers")
    .select("photo_url, bio, follower_count")
    .order("follower_count", { ascending: false });

  if (final) {
    log("enrich", `\nDB totals:`);
    log("enrich", `  Photos:      ${final.filter((p) => p.photo_url).length}/${final.length}`);
    log("enrich", `  Bios:        ${final.filter((p) => p.bio).length}/${final.length}`);
    log("enrich", `  Followers>0: ${final.filter((p) => p.follower_count > 0).length}/${final.length}`);
  }
}

main().catch(console.error);
