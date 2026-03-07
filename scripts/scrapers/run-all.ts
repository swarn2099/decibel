import { scrapeSoundCloud } from "./soundcloud";
import { scrapeRA } from "./ra";
import { scrapeDICE } from "./dice";
import { scrape19hz } from "./nineteenhz";
import { enrichProfiles } from "./enrich";

async function main() {
  const start = Date.now();
  console.log("=== Decibel Scraper Pipeline ===\n");

  // Run scrapers sequentially to avoid overwhelming resources
  console.log("--- 1/5: SoundCloud ---");
  try {
    await scrapeSoundCloud();
  } catch (err) {
    console.error("SoundCloud scraper failed:", err);
  }

  console.log("\n--- 2/5: Resident Advisor ---");
  try {
    await scrapeRA();
  } catch (err) {
    console.error("RA scraper failed:", err);
  }

  console.log("\n--- 3/5: DICE ---");
  try {
    await scrapeDICE();
  } catch (err) {
    console.error("DICE scraper failed:", err);
  }

  console.log("\n--- 4/5: 19hz.info ---");
  try {
    await scrape19hz();
  } catch (err) {
    console.error("19hz scraper failed:", err);
  }

  console.log("\n--- 5/5: Profile Enricher ---");
  try {
    await enrichProfiles();
  } catch (err) {
    console.error("Enricher failed:", err);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Pipeline complete in ${elapsed}s ===`);
}

main().catch(console.error);
