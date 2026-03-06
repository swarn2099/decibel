import { getSupabase, log } from "../scrapers/utils";
import { generateSpotlight } from "./spotlight";
import { generateRoundup } from "./roundup";
import { generateTeaser } from "./teaser";
import { mkdirSync } from "fs";
import { resolve } from "path";

const TEASER_FEATURES = ["passport", "dashboard", "wrapped", "tiers"];

async function main() {
  const supabase = getSupabase();
  console.log("=== Decibel Weekly Content Generator ===\n");

  // Create dated output directory
  const date = new Date().toISOString().split("T")[0];
  const outputDir = resolve(process.cwd(), `content/output/week-${date}`);
  mkdirSync(outputDir, { recursive: true });
  log("weekly", `Output directory: ${outputDir}`);

  const generated: { type: string; path: string }[] = [];

  // 1. Generate 2-3 DJ spotlights
  log("weekly", "Selecting performers for spotlights...");

  const { data: performers } = await supabase
    .from("performers")
    .select("slug, name, photo_url, genres, follower_count")
    .not("photo_url", "is", null)
    .order("follower_count", { ascending: false })
    .limit(20);

  let spotlightCount = 0;
  if (performers && performers.length > 0) {
    const shuffled = performers.sort(() => Math.random() - 0.5);
    spotlightCount = Math.min(3, shuffled.length);

    for (let i = 0; i < spotlightCount; i++) {
      log("weekly", `Spotlight ${i + 1}/${spotlightCount}: ${shuffled[i].name}`);
      try {
        const path = await generateSpotlight(shuffled[i].slug, outputDir);
        if (path) generated.push({ type: "spotlight", path });
      } catch (err) {
        console.error(`Failed spotlight for ${shuffled[i].name}:`, err);
      }
    }
  } else {
    log("weekly", "No performers with photos found -- skipping spotlights");
  }

  // 2. Generate scene roundup
  log("weekly", "Generating scene roundup...");
  try {
    const path = await generateRoundup(7, outputDir);
    if (path) generated.push({ type: "roundup", path });
  } catch (err) {
    console.error("Failed roundup:", err);
  }

  // 3. Generate teasers -- enough to reach at least 5 total posts
  // spotlightCount + 1 roundup + teaserCount >= 5, capped at 2
  const teaserCount = Math.min(2, Math.max(1, 5 - spotlightCount - 1));
  const shuffledFeatures = TEASER_FEATURES.sort(() => Math.random() - 0.5);

  for (let i = 0; i < teaserCount; i++) {
    log("weekly", `Teaser: ${shuffledFeatures[i]}`);
    try {
      const path = await generateTeaser(shuffledFeatures[i], outputDir);
      if (path) generated.push({ type: "teaser", path });
    } catch (err) {
      console.error(`Failed teaser for ${shuffledFeatures[i]}:`, err);
    }
  }

  // Summary
  const spotlights = generated.filter((g) => g.type === "spotlight").length;
  const roundups = generated.filter((g) => g.type === "roundup").length;
  const teasers = generated.filter((g) => g.type === "teaser").length;

  console.log(`\n=== Generated ${generated.length} posts ===`);
  console.log(`  Spotlights: ${spotlights}`);
  console.log(`  Roundups: ${roundups}`);
  console.log(`  Teasers: ${teasers}`);
  console.log(`  Output: ${outputDir}`);
  generated.forEach((g) => console.log(`  [${g.type}] ${g.path}`));
}

main().catch(console.error);
