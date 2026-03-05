import { getSupabase, slugify, namesMatch, log, logError } from "./utils";

const SEARCH_QUERIES = [
  "house chicago",
  "techno chicago",
  "deep house chicago",
  "tech house chicago",
  "chicago dj",
  "chicago house music",
];

interface SCUser {
  id: number;
  username: string;
  permalink: string;
  avatar_url: string;
  description: string;
  followers_count: number;
  city: string;
  track_count: number;
}

export async function scrapeSoundCloud() {
  const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
  if (!clientId) {
    log("soundcloud", "No SOUNDCLOUD_CLIENT_ID set — skipping SoundCloud scraper");
    return;
  }

  const supabase = getSupabase();
  const seen = new Set<string>();
  let inserted = 0;

  for (const query of SEARCH_QUERIES) {
    log("soundcloud", `Searching: "${query}"`);

    try {
      const url = `https://api-v2.soundcloud.com/search/users?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=50`;
      const res = await fetch(url);

      if (!res.ok) {
        logError("soundcloud", `Search failed for "${query}": ${res.status}`);
        continue;
      }

      const data = await res.json();
      const users: SCUser[] = data.collection || [];

      for (const user of users) {
        const normalName = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (seen.has(normalName)) continue;
        seen.add(normalName);

        // Check if performer already exists
        const { data: existing } = await supabase
          .from("performers")
          .select("id, name")
          .or(`slug.eq.${slugify(user.username)},name.ilike.${user.username}`);

        const match = existing?.find((p) => namesMatch(p.name, user.username));

        if (match) {
          // Update existing performer with SoundCloud data
          await supabase
            .from("performers")
            .update({
              soundcloud_url: `https://soundcloud.com/${user.permalink}`,
              photo_url: user.avatar_url?.replace("-large", "-t500x500") || undefined,
              bio: user.description || undefined,
              follower_count: user.followers_count,
              updated_at: new Date().toISOString(),
            })
            .eq("id", match.id);

          await supabase.from("scraped_profiles").insert({
            performer_id: match.id,
            source: "soundcloud",
            raw_data: user,
          });

          log("soundcloud", `Updated: ${user.username}`);
        } else {
          // Insert new performer
          const slug = slugify(user.username);
          const { data: newPerformer, error } = await supabase
            .from("performers")
            .insert({
              name: user.username,
              slug,
              bio: user.description || null,
              photo_url: user.avatar_url?.replace("-large", "-t500x500") || null,
              soundcloud_url: `https://soundcloud.com/${user.permalink}`,
              city: "Chicago",
              follower_count: user.followers_count,
              genres: inferGenres(query),
            })
            .select("id")
            .single();

          if (error) {
            // Slug conflict — append random suffix
            const { data: retry } = await supabase
              .from("performers")
              .insert({
                name: user.username,
                slug: `${slug}-sc`,
                bio: user.description || null,
                photo_url: user.avatar_url?.replace("-large", "-t500x500") || null,
                soundcloud_url: `https://soundcloud.com/${user.permalink}`,
                city: "Chicago",
                follower_count: user.followers_count,
                genres: inferGenres(query),
              })
              .select("id")
              .single();

            if (retry) {
              await supabase.from("scraped_profiles").insert({
                performer_id: retry.id,
                source: "soundcloud",
                raw_data: user,
              });
              inserted++;
            }
          } else if (newPerformer) {
            await supabase.from("scraped_profiles").insert({
              performer_id: newPerformer.id,
              source: "soundcloud",
              raw_data: user,
            });
            inserted++;
          }

          log("soundcloud", `New: ${user.username}`);
        }
      }
    } catch (err) {
      logError("soundcloud", `Failed query "${query}"`, err);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 1000));
  }

  log("soundcloud", `Done. Inserted ${inserted} new performers.`);
}

function inferGenres(query: string): string[] {
  const genres: string[] = [];
  if (query.includes("house")) genres.push("house");
  if (query.includes("techno")) genres.push("techno");
  if (query.includes("deep house")) genres.push("deep house");
  if (query.includes("tech house")) genres.push("tech house");
  return genres.length > 0 ? genres : ["electronic"];
}

if (require.main === module) {
  scrapeSoundCloud().catch(console.error);
}
