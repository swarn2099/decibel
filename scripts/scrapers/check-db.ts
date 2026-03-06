import { getSupabase } from "./utils";

async function check() {
  const sb = getSupabase();
  const { data, count } = await sb
    .from("performers")
    .select("name, slug, follower_count, soundcloud_url, bio, photo_url, instagram_handle", { count: "exact" })
    .order("follower_count", { ascending: false })
    .limit(30);

  console.log("Total performers:", count);
  if (data) {
    const withBio = data.filter(p => p.bio).length;
    const withPhoto = data.filter(p => p.photo_url).length;
    const withIg = data.filter(p => p.instagram_handle).length;
    const withFollowers = data.filter(p => p.follower_count > 0).length;
    console.log(`Stats (of first 30): bio=${withBio} photo=${withPhoto} ig=${withIg} followers>0=${withFollowers}`);
    console.log();
    for (const p of data.slice(0, 15)) {
      const sc = p.soundcloud_url ? p.soundcloud_url.replace('https://soundcloud.com/', '') : 'none';
      console.log(
        `  ${p.name} | ${p.follower_count || 0} | SC:${sc} | IG:${p.instagram_handle || 'none'} | bio:${p.bio ? 'yes' : 'no'} | pic:${p.photo_url ? 'yes' : 'no'}`
      );
    }
  }

  // Also check events and venues
  const { count: eventCount } = await sb.from("events").select("id", { count: "exact", head: true });
  const { count: venueCount } = await sb.from("venues").select("id", { count: "exact", head: true });
  console.log(`\nEvents: ${eventCount}, Venues: ${venueCount}`);
}

check().catch(console.error);
