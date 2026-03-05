import { getSupabase, log } from "../scrapers/utils";
import { generateSpotlight } from "./spotlight";
import { generateRoundup } from "./roundup";
import { generateTeaser } from "./teaser";

const TEASER_FEATURES = ["passport", "dashboard", "wrapped", "tiers"];

async function main() {
  const supabase = getSupabase();
  console.log("=== Decibel Weekly Content Generator ===\n");

  const generated: string[] = [];

  // 1. Generate 2-3 DJ spotlights
  log("weekly", "Selecting performers for spotlights...");

  // Pick performers with the most data (photo, genres, gigs)
  const { data: performers } = await supabase
    .from("performers")
    .select("slug, name, photo_url, genres, follower_count")
    .not("photo_url", "is", null)
    .order("follower_count", { ascending: false })
    .limit(20);

  if (performers && performers.length > 0) {
    // Shuffle and pick 2-3
    const shuffled = performers.sort(() => Math.random() - 0.5);
    const spotlightCount = Math.min(3, shuffled.length);

    for (let i = 0; i < spotlightCount; i++) {
      log("weekly", `Spotlight ${i + 1}/${spotlightCount}: ${shuffled[i].name}`);
      try {
        const path = await generateSpotlight(shuffled[i].slug);
        if (path) generated.push(path);
      } catch (err) {
        console.error(`Failed spotlight for ${shuffled[i].name}:`, err);
      }
    }
  } else {
    log("weekly", "No performers with photos found — skipping spotlights");
  }

  // 2. Generate scene roundup
  log("weekly", "Generating scene roundup...");
  try {
    const path = await generateRoundup(7);
    if (path) generated.push(path);
  } catch (err) {
    console.error("Failed roundup:", err);
  }

  // 3. Generate 1-2 product teasers
  const teaserCount = Math.floor(Math.random() * 2) + 1;
  const shuffledFeatures = TEASER_FEATURES.sort(() => Math.random() - 0.5);

  for (let i = 0; i < teaserCount; i++) {
    log("weekly", `Teaser: ${shuffledFeatures[i]}`);
    try {
      const path = await generateTeaser(shuffledFeatures[i]);
      if (path) generated.push(path);
    } catch (err) {
      console.error(`Failed teaser for ${shuffledFeatures[i]}:`, err);
    }
  }

  console.log(`\n=== Generated ${generated.length} posts ===`);
  generated.forEach((p) => console.log(`  ${p}`));
}

main().catch(console.error);
