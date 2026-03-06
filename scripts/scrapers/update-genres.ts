/**
 * Re-scrapes EDMTrain to extract genres for existing performers.
 * Uses the .genre class (not .eventGenre) to get genre tags.
 */
import { chromium } from "playwright";
import { getSupabase, log } from "./utils";

async function main() {
  const supabase = getSupabase();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://edmtrain.com/chicago-il", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  for (let i = 0; i < 10; i++) {
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await page.waitForTimeout(1200);
  }

  // Extract artist → genres mapping
  const artistGenres = await page.evaluate(`
    (() => {
      const map = {};
      const containers = document.querySelectorAll('.eventContainer');
      containers.forEach(c => {
        const performerEls = c.querySelectorAll('[itemprop="performer"]');
        const artists = [];
        performerEls.forEach(el => {
          const name = el.textContent?.trim();
          if (name) artists.push(name);
        });

        const genreEls = c.querySelectorAll('.genre');
        const genres = [];
        genreEls.forEach(el => {
          const g = el.textContent?.trim().toLowerCase();
          if (g && g.length > 1) genres.push(g);
        });

        if (genres.length > 0) {
          for (const artist of artists) {
            if (!map[artist]) map[artist] = [];
            for (const g of genres) {
              if (map[artist].indexOf(g) === -1) map[artist].push(g);
            }
          }
        }
      });
      return map;
    })()
  `) as Record<string, string[]>;

  await browser.close();

  const artistCount = Object.keys(artistGenres).length;
  log("genres", `Found genres for ${artistCount} artists`);

  // Update performers in DB
  let updated = 0;
  for (const [artistName, genres] of Object.entries(artistGenres)) {
    const uniqueGenres = [...new Set(genres)].slice(0, 5);
    if (uniqueGenres.length === 0) continue;

    const { error } = await supabase
      .from("performers")
      .update({ genres: uniqueGenres })
      .ilike("name", artistName);

    if (!error) {
      updated++;
    }
  }

  log("genres", `Updated genres for ${updated} performers`);

  // Stats
  const { data: performers } = await supabase
    .from("performers")
    .select("genres")
    .order("name");

  if (performers) {
    const genreCounts = new Map<string, number>();
    for (const p of performers) {
      for (const g of (p.genres || [])) {
        genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
      }
    }
    const topGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]);
    log("genres", "\nGenre breakdown:");
    for (const [genre, count] of topGenres) {
      log("genres", `  ${genre}: ${count}`);
    }
  }
}

main().catch(console.error);
