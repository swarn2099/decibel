/**
 * One-shot DB cleanup script for bad performer names and Instagram URLs.
 *
 * Usage:
 *   npx tsx scripts/scrapers/clean-performers.ts --dry-run   (default, logs what would happen)
 *   npx tsx scripts/scrapers/clean-performers.ts --execute    (actually makes changes)
 */
import { getSupabase, isNonArtistName, normalizeInstagramHandle, log } from "./utils";

const isDryRun = !process.argv.includes("--execute");

async function cleanPerformers() {
  const supabase = getSupabase();

  log("clean", `Mode: ${isDryRun ? "DRY RUN (no changes)" : "EXECUTE (will modify data)"}`);

  // Fetch all performers with event count
  const { data: performers, error } = await supabase
    .from("performers")
    .select("id, name, slug, instagram_handle, events(count)");

  if (error || !performers) {
    log("clean", `Failed to fetch performers: ${error?.message}`);
    return;
  }

  log("clean", `Total performers in DB: ${performers.length}`);

  // ===== Phase A: Bad Names =====
  log("clean", "\n=== PHASE A: Bad Performer Names ===");

  const toDelete: { id: string; name: string; eventCount: number }[] = [];
  const toReview: { id: string; name: string; eventCount: number }[] = [];

  for (const p of performers) {
    if (isNonArtistName(p.name)) {
      const eventCount = (p.events as any)?.[0]?.count ?? 0;

      if (eventCount <= 1) {
        toDelete.push({ id: p.id, name: p.name, eventCount });
      } else {
        toReview.push({ id: p.id, name: p.name, eventCount });
      }
    }
  }

  log("clean", `Flagged for deletion (0-1 events): ${toDelete.length}`);
  for (const p of toDelete) {
    log("clean", `  DELETE: "${p.name}" (${p.eventCount} events)`);
  }

  log("clean", `Flagged for review (2+ events): ${toReview.length}`);
  for (const p of toReview) {
    log("clean", `  REVIEW: "${p.name}" (${p.eventCount} events)`);
  }

  if (!isDryRun && toDelete.length > 0) {
    const ids = toDelete.map((p) => p.id);

    // Delete dependent rows first (cascade)
    const tables = ["events", "collections", "fan_tiers", "messages", "scraped_profiles"];
    for (const table of tables) {
      const { error: delErr } = await supabase
        .from(table)
        .delete()
        .in("performer_id", ids);
      if (delErr) {
        log("clean", `  Warning: failed to delete from ${table}: ${delErr.message}`);
      }
    }

    // Delete performers
    const { error: perfErr } = await supabase
      .from("performers")
      .delete()
      .in("id", ids);

    if (perfErr) {
      log("clean", `  ERROR deleting performers: ${perfErr.message}`);
    } else {
      log("clean", `  Deleted ${ids.length} performers`);
    }
  }

  // ===== Phase B: Instagram Normalization =====
  log("clean", "\n=== PHASE B: Instagram Handle Normalization ===");

  let normalizedCount = 0;

  for (const p of performers) {
    const handle = p.instagram_handle;
    if (!handle) continue;

    // Check if it needs normalization (contains URL parts or starts with http/www/@)
    const needsNormalization =
      handle.includes("instagram.com") ||
      handle.startsWith("http") ||
      handle.startsWith("www") ||
      handle.startsWith("@");

    if (!needsNormalization) continue;

    const normalized = normalizeInstagramHandle(handle);

    if (normalized && normalized !== handle) {
      log("clean", `  NORMALIZE: "${handle}" -> "${normalized}" (${p.name})`);
      normalizedCount++;

      if (!isDryRun) {
        const { error: updateErr } = await supabase
          .from("performers")
          .update({ instagram_handle: normalized })
          .eq("id", p.id);

        if (updateErr) {
          log("clean", `    ERROR: ${updateErr.message}`);
        }
      }
    }
  }

  log("clean", `Instagram handles to normalize: ${normalizedCount}`);

  // ===== Summary =====
  log("clean", "\n=== SUMMARY ===");
  log("clean", `Performers to delete: ${toDelete.length}`);
  log("clean", `Instagram handles to normalize: ${normalizedCount}`);
  log("clean", `Performers flagged for review: ${toReview.length}`);
  log("clean", isDryRun ? "Run with --execute to apply changes." : "Changes applied.");
}

cleanPerformers().catch(console.error);
