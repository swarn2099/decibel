/**
 * Deduplication: Find and merge performers with similar names.
 * Handles: "DJ X" vs "X", capitalization variants, extra whitespace.
 * Dry-run by default — pass --apply to actually merge.
 */
import { getSupabase, log } from "./utils";

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dj|the|mc)\s+/i, "")
    .replace(/[^a-z0-9]/g, "");
}

interface Performer {
  id: string;
  name: string;
  slug: string;
  follower_count: number | null;
  soundcloud_url: string | null;
  photo_url: string | null;
  bio: string | null;
  is_chicago_resident: boolean;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const supabase = getSupabase();

  const { data: performers } = await supabase
    .from("performers")
    .select("id, name, slug, follower_count, soundcloud_url, photo_url, bio, is_chicago_resident")
    .order("name");

  if (!performers) {
    log("dedup", "No performers found");
    return;
  }

  // Group by normalized name
  const groups = new Map<string, Performer[]>();
  for (const p of performers) {
    const key = normalize(p.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const dupes = [...groups.entries()].filter(([, v]) => v.length > 1);

  if (dupes.length === 0) {
    log("dedup", "No duplicates found!");
    return;
  }

  log("dedup", `Found ${dupes.length} duplicate groups:\n`);

  for (const [key, group] of dupes) {
    log("dedup", `  Group "${key}":`);
    for (const p of group) {
      const tags = [
        p.soundcloud_url ? "SC" : null,
        p.photo_url ? "photo" : null,
        p.follower_count ? `${p.follower_count} followers` : null,
        p.is_chicago_resident ? "RESIDENT" : null,
      ].filter(Boolean).join(", ");
      log("dedup", `    - "${p.name}" (${p.slug}) [${tags || "no data"}]`);
    }

    if (apply) {
      // Keep the one with the most data (SC profile, photo, followers)
      const ranked = [...group].sort((a, b) => {
        const score = (p: Performer) =>
          (p.soundcloud_url ? 10 : 0) +
          (p.photo_url ? 5 : 0) +
          (p.follower_count || 0) / 1000 +
          (p.bio ? 3 : 0) +
          (p.is_chicago_resident ? 2 : 0);
        return score(b) - score(a);
      });

      const keep = ranked[0];
      const remove = ranked.slice(1);

      log("dedup", `    KEEP: "${keep.name}" (${keep.slug})`);

      for (const dup of remove) {
        // Reassign events
        await supabase
          .from("events")
          .update({ performer_id: keep.id })
          .eq("performer_id", dup.id);

        // Reassign collections
        await supabase
          .from("collections")
          .update({ performer_id: keep.id })
          .eq("performer_id", dup.id);

        // Reassign fan_tiers
        await supabase
          .from("fan_tiers")
          .update({ performer_id: keep.id })
          .eq("performer_id", dup.id);

        // Delete scraped_profiles
        await supabase
          .from("scraped_profiles")
          .delete()
          .eq("performer_id", dup.id);

        // Delete messages
        await supabase
          .from("messages")
          .delete()
          .eq("performer_id", dup.id);

        // Delete the duplicate performer
        await supabase
          .from("performers")
          .delete()
          .eq("id", dup.id);

        log("dedup", `    REMOVED: "${dup.name}" (${dup.slug})`);
      }

      // Merge resident status
      if (remove.some((r) => r.is_chicago_resident) && !keep.is_chicago_resident) {
        await supabase
          .from("performers")
          .update({ is_chicago_resident: true })
          .eq("id", keep.id);
      }
    }
  }

  if (!apply) {
    log("dedup", `\nDry run — pass --apply to merge duplicates`);
  }
}

main().catch(console.error);
