import { chromium } from "playwright";
import { getSupabase, log, logError } from "./utils";

// More junk patterns to remove (channels, podcasts, compilations — not real DJs)
const JUNK_PATTERNS = [
  /^deep house\s/i, /^chicago house\s/i, /^house music\s/i,
  /^tech house$/i, /^tech house\s/i, /^afro house/i,
  /stronghouse/i, /tiny house/i, /house clique/i, /house grooves/i,
  /house mixes/i, /house remix/i, /house sessions/i, /italo disco/i,
  /1103 musik/i, /data transmission/i, /^chicago_house$/i,
  /chicagohouse\d/i, /houseproject$/i, /housetechno$/i, /housetony$/i,
  /^techno bible/i, /^technohead$/i, /^technomystic$/i, /^technorage/i,
  /^technotony$/i, /^techno tizlan/i, /^techno-logist/i, /^techno#/i,
  /^pope of techno$/i, /^secretechno$/i, /^fazr?e techno/i,
  /^ilike\s?techno/i, /^know your techno/i, /section 8 techno/i,
  /deep house radio/i, /vibey deep/i, /melodic\.deep\.house/i,
  /^dha am\b/i, /^dha fm\b/i, /music house chicago/i,
  /jesus house chicago/i, /sound of symmetry/i,
  /ibiza.*tech house/i, /elektra.*melodic/i,
  /deep.*house.*techno.*more/i, /dj house from chicago/i,
];

export async function reEnrich() {
  const supabase = getSupabase();

  const { data: performers } = await supabase
    .from("performers")
    .select("id, name, soundcloud_url, photo_url, bio, follower_count, instagram_handle, genres")
    .order("name");

  if (!performers || performers.length === 0) {
    log("re-enrich", "No performers found");
    return;
  }

  log("re-enrich", `Total performers in DB: ${performers.length}`);

  // --- Step 1: Remove junk entries ---
  const junkIds: string[] = [];
  const realPerformers = performers.filter((p) => {
    const isJunk = JUNK_PATTERNS.some((pat) => pat.test(p.name));
    if (isJunk) junkIds.push(p.id);
    return !isJunk;
  });

  if (junkIds.length > 0) {
    log("re-enrich", `Removing ${junkIds.length} non-DJ entries...`);
    for (const id of junkIds) {
      const name = performers.find((p) => p.id === id)?.name;
      await supabase.from("scraped_profiles").delete().eq("performer_id", id);
      await supabase.from("events").delete().eq("performer_id", id);
      await supabase.from("performers").delete().eq("id", id);
      log("re-enrich", `  Removed: ${name}`);
    }
  }

  // --- Step 2: Enrich via Playwright (intercept SC API calls) ---
  const toEnrich = realPerformers.filter((p) => p.soundcloud_url);
  log("re-enrich", `Enriching ${toEnrich.length} performers via Playwright...`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    });

    let enriched = 0;
    let failed = 0;

    for (const performer of toEnrich) {
      const page = await context.newPage();

      try {
        // Intercept API responses to capture user data
        let apiData: Record<string, unknown> | null = null;

        page.on("response", async (response) => {
          const url = response.url();
          if (url.includes("api-v2.soundcloud.com/users/") && !url.includes("/tracks") && !url.includes("/likes")) {
            try {
              const json = await response.json();
              if (json.avatar_url || json.username) {
                apiData = json;
              }
            } catch {}
          }
        });

        await page.goto(performer.soundcloud_url, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });
        await page.waitForTimeout(4000);

        const updates: Record<string, unknown> = {};

        if (apiData) {
          // Got data from API interception
          const data = apiData as {
            avatar_url?: string;
            description?: string;
            followers_count?: number;
            city?: string;
            country_code?: string;
            full_name?: string;
            username?: string;
          };

          if (data.avatar_url && !performer.photo_url) {
            updates.photo_url = data.avatar_url.replace("-large", "-t500x500");
          }
          if (data.description && data.description.length > 5 && !performer.bio) {
            updates.bio = data.description.slice(0, 500);
          }
          if (data.followers_count && data.followers_count > 0 && !performer.follower_count) {
            updates.follower_count = data.followers_count;
          }
          if (data.city) {
            updates.city = data.city + (data.country_code ? `, ${data.country_code}` : "");
          }
        } else {
          // Fallback: extract from rendered DOM
          const profile = await page.evaluate(`
            (() => {
              const ogImg = document.querySelector('meta[property="og:image"]');
              const ogDesc = document.querySelector('meta[property="og:description"]');

              // Try to find avatar in various ways
              let avatarUrl = ogImg?.getAttribute('content') || null;
              if (!avatarUrl || avatarUrl.includes('fb_placeholder')) {
                const imgs = document.querySelectorAll('img[src*="i1.sndcdn.com"], img[src*="avatars-"]');
                for (const img of imgs) {
                  const src = img.getAttribute('src') || '';
                  if (src.includes('avatars-') || (src.includes('sndcdn') && !src.includes('artworks'))) {
                    avatarUrl = src;
                    break;
                  }
                }
              }

              // Also check background-image spans
              if (!avatarUrl || avatarUrl.includes('fb_placeholder')) {
                const spans = document.querySelectorAll('span[style*="background-image"]');
                for (const span of spans) {
                  const style = span.getAttribute('style') || '';
                  const match = style.match(/url\\("([^"]+)"\\)/);
                  if (match && (match[1].includes('avatars-') || match[1].includes('sndcdn'))) {
                    avatarUrl = match[1];
                    break;
                  }
                }
              }

              return {
                avatarUrl,
                description: ogDesc?.getAttribute('content') || '',
              };
            })()
          `) as { avatarUrl: string | null; description: string };

          if (profile.avatarUrl && !profile.avatarUrl.includes("fb_placeholder") && !performer.photo_url) {
            updates.photo_url = profile.avatarUrl.replace("-large", "-t500x500");
          }
          if (profile.description && profile.description.length > 10 && !performer.bio) {
            updates.bio = profile.description.slice(0, 500);
          }
        }

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          const { error } = await supabase
            .from("performers")
            .update(updates)
            .eq("id", performer.id);

          if (error) {
            logError("re-enrich", `DB error for ${performer.name}`, error);
          } else {
            enriched++;
            const fields = Object.keys(updates).filter((k) => k !== "updated_at");
            log("re-enrich", `Updated ${performer.name}: ${fields.join(", ")}`);
          }
        } else {
          log("re-enrich", `${performer.name}: no new data`);
        }
      } catch (err) {
        logError("re-enrich", `Failed: ${performer.name}`, err);
        failed++;
      } finally {
        await page.close();
      }

      // Brief delay
      await new Promise((r) => setTimeout(r, 800));
    }

    log("re-enrich", `\nEnriched: ${enriched}, Failed: ${failed}`);
  } finally {
    if (browser) await browser.close();
  }

  // --- Step 3: Print final stats ---
  const { data: final } = await supabase
    .from("performers")
    .select("id, name, photo_url, bio, follower_count, instagram_handle")
    .order("follower_count", { ascending: false });

  if (final) {
    const total = final.length;
    const photos = final.filter((p) => p.photo_url).length;
    const bios = final.filter((p) => p.bio).length;
    const followers = final.filter((p) => p.follower_count && p.follower_count > 0).length;
    const igs = final.filter((p) => p.instagram_handle).length;

    log("re-enrich", `\n=== FINAL STATS ===`);
    log("re-enrich", `Total: ${total}`);
    log("re-enrich", `  Photos:    ${photos}/${total}`);
    log("re-enrich", `  Bios:      ${bios}/${total}`);
    log("re-enrich", `  Followers: ${followers}/${total}`);
    log("re-enrich", `  Instagram: ${igs}/${total}`);
    log("re-enrich", `\nTop performers:`);
    for (const p of final.slice(0, 15)) {
      const hasPhoto = p.photo_url ? "pic" : "---";
      const hasBio = p.bio ? "bio" : "---";
      log("re-enrich", `  [${hasPhoto}|${hasBio}] ${p.name} (${p.follower_count || 0} followers)`);
    }
  }
}

if (require.main === module) {
  reEnrich().catch(console.error);
}
