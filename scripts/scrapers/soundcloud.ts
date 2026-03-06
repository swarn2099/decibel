import { chromium } from "playwright";
import { getSupabase, slugify, namesMatch, log, logError } from "./utils";

const SEARCH_QUERIES = [
  "house chicago",
  "techno chicago",
  "deep house chicago",
  "tech house chicago",
  "chicago dj",
  "chicago house music",
];

export async function scrapeSoundCloud() {
  const supabase = getSupabase();
  const seen = new Set<string>();
  let inserted = 0;
  let updated = 0;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    for (const query of SEARCH_QUERIES) {
      log("soundcloud", `Searching: "${query}"`);

      try {
        await page.goto(
          `https://soundcloud.com/search/people?q=${encodeURIComponent(query)}`,
          { waitUntil: "domcontentloaded", timeout: 30000 }
        );
        await page.waitForTimeout(3000);

        // Scroll to load more
        for (let i = 0; i < 3; i++) {
          await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
          await page.waitForTimeout(1500);
        }

        // Extract user links from search results using string eval to avoid tsx __name issue
        const users: { username: string; permalink: string; profileUrl: string }[] =
          await page.evaluate(`
            (() => {
              const results = [];
              const links = document.querySelectorAll('.searchList__item a.sc-link-primary, .userBadgeListItem__title a, a[class*="userBadge"]');
              links.forEach(link => {
                const href = link.getAttribute('href') || '';
                const text = link.textContent?.trim() || '';
                if (href && text && text.length > 1 && text.length < 60) {
                  results.push({
                    username: text,
                    permalink: href.replace('/', ''),
                    profileUrl: 'https://soundcloud.com' + href,
                  });
                }
              });
              // Fallback: grab user profile links
              if (results.length === 0) {
                const allLinks = document.querySelectorAll('a[href^="/"]');
                const seen = new Set();
                allLinks.forEach(link => {
                  const href = link.getAttribute('href') || '';
                  const text = link.textContent?.trim() || '';
                  const parts = href.split('/').filter(Boolean);
                  if (parts.length === 1 && text.length > 1 && text.length < 50 &&
                      !href.includes('/search') && !href.includes('/discover') &&
                      !href.includes('/stream') && !href.includes('/you/') &&
                      !href.includes('/settings') && !href.includes('/pages/') &&
                      !href.startsWith('/tags/') && !seen.has(href)) {
                    seen.add(href);
                    results.push({ username: text, permalink: parts[0], profileUrl: 'https://soundcloud.com' + href });
                  }
                });
              }
              return results;
            })()
          `);

        log("soundcloud", `Found ${users.length} users for "${query}"`);

        for (const user of users) {
          const normalName = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (seen.has(normalName) || normalName.length < 2) continue;
          seen.add(normalName);

          try {
            await page.goto(user.profileUrl, { waitUntil: "domcontentloaded", timeout: 12000 });
            await page.waitForTimeout(2000);

            // Extract profile using string eval
            const profile: { name: string; bio: string; avatarUrl: string | null; followers: string; city: string } =
              await page.evaluate(`
                (() => {
                  const nameEl = document.querySelector('h1, .profileHeaderInfo__userName');
                  const bioEl = document.querySelector('.profileHeaderInfo__bio, [class*="bio"]');
                  const avatarEl = document.querySelector('.profileHeaderInfo__avatar img, [class*="avatar"] img, img[src*="avatars-"]');
                  const followersEl = document.querySelector('.infoStats__statLink[href*="followers"] .infoStats__value, a[href*="followers"] [class*="value"]');
                  const cityEl = document.querySelector('.profileHeaderInfo__additional, [class*="location"]');
                  return {
                    name: nameEl?.textContent?.trim() || '',
                    bio: bioEl?.textContent?.trim() || '',
                    avatarUrl: avatarEl?.src || null,
                    followers: followersEl?.textContent?.trim() || '0',
                    city: cityEl?.textContent?.trim() || '',
                  };
                })()
              `);

            const displayName = profile.name || user.username;
            const followerCount = parseCount(profile.followers);
            const avatarHiRes = profile.avatarUrl?.replace("-large", "-t500x500") || null;

            // Check if exists
            const { data: existing } = await supabase
              .from("performers")
              .select("id, name")
              .or(`slug.eq.${slugify(displayName)},name.ilike.${displayName}`);

            const match = existing?.find((p) => namesMatch(p.name, displayName));

            if (match) {
              await supabase.from("performers").update({
                soundcloud_url: user.profileUrl,
                photo_url: avatarHiRes || undefined,
                bio: profile.bio || undefined,
                follower_count: followerCount,
                updated_at: new Date().toISOString(),
              }).eq("id", match.id);

              await supabase.from("scraped_profiles").insert({
                performer_id: match.id, source: "soundcloud",
                raw_data: { ...profile, permalink: user.permalink, searchQuery: query },
              });
              updated++;
              log("soundcloud", `Updated: ${displayName} (${followerCount})`);
            } else {
              const slug = slugify(displayName);
              const { data: newP, error } = await supabase.from("performers").insert({
                name: displayName, slug, bio: profile.bio || null,
                photo_url: avatarHiRes, soundcloud_url: user.profileUrl,
                city: profile.city || "Chicago", follower_count: followerCount,
                genres: inferGenres(query),
              }).select("id").single();

              if (error) {
                const { data: retry } = await supabase.from("performers").insert({
                  name: displayName, slug: `${slug}-sc`, bio: profile.bio || null,
                  photo_url: avatarHiRes, soundcloud_url: user.profileUrl,
                  city: profile.city || "Chicago", follower_count: followerCount,
                  genres: inferGenres(query),
                }).select("id").single();
                if (retry) { inserted++; await supabase.from("scraped_profiles").insert({ performer_id: retry.id, source: "soundcloud", raw_data: { ...profile, permalink: user.permalink } }); }
              } else if (newP) {
                inserted++;
                await supabase.from("scraped_profiles").insert({ performer_id: newP.id, source: "soundcloud", raw_data: { ...profile, permalink: user.permalink } });
              }
              log("soundcloud", `New: ${displayName} (${followerCount})`);
            }
          } catch (err) {
            logError("soundcloud", `Failed: ${user.username}`, err);
          }
          await page.waitForTimeout(800);
        }
      } catch (err) {
        logError("soundcloud", `Failed query "${query}"`, err);
      }
      await page.waitForTimeout(2000);
    }
  } finally {
    if (browser) await browser.close();
  }
  log("soundcloud", `Done. ${inserted} new, ${updated} updated.`);
}

function parseCount(str: string): number {
  const cleaned = str.replace(/,/g, "").trim();
  const match = cleaned.match(/([\d.]+)\s*([KkMm])?/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  if (suffix === "K") return Math.round(num * 1000);
  if (suffix === "M") return Math.round(num * 1000000);
  return Math.round(num);
}

function inferGenres(query: string): string[] {
  const genres: string[] = [];
  if (query.includes("deep house")) genres.push("deep house");
  else if (query.includes("tech house")) genres.push("tech house");
  else if (query.includes("house")) genres.push("house");
  if (query.includes("techno")) genres.push("techno");
  return genres.length > 0 ? genres : ["electronic"];
}

if (require.main === module) {
  scrapeSoundCloud().catch(console.error);
}
