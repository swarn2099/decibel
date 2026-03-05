import { getSupabase, log } from "../scrapers/utils";

export interface OutreachTarget {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  soundcloud_url: string | null;
  instagram_handle: string | null;
  follower_count: number;
  genres: string[];
  gig_count: number;
  venues_played: string[];
}

export async function selectTargets(limit = 10): Promise<OutreachTarget[]> {
  const supabase = getSupabase();

  // Get unclaimed performers with social presence
  const { data: performers } = await supabase
    .from("performers")
    .select("*")
    .eq("claimed", false)
    .or("soundcloud_url.not.is.null,instagram_handle.not.is.null")
    .order("follower_count", { ascending: false })
    .limit(100);

  if (!performers || performers.length === 0) {
    log("targets", "No unclaimed performers with social links found");
    return [];
  }

  // Enrich with gig data
  const targets: OutreachTarget[] = [];

  for (const p of performers) {
    // Count recent gigs (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { count: gigCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("performer_id", p.id)
      .gte("event_date", sixMonthsAgo.toISOString().split("T")[0]);

    // Get venues played
    const { data: eventVenues } = await supabase
      .from("events")
      .select("venues(name)")
      .eq("performer_id", p.id);

    const venuesPlayed = [
      ...new Set(
        eventVenues
          ?.map((e) => (e.venues as unknown as { name: string })?.name)
          .filter(Boolean) || []
      ),
    ];

    targets.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      bio: p.bio,
      photo_url: p.photo_url,
      soundcloud_url: p.soundcloud_url,
      instagram_handle: p.instagram_handle,
      follower_count: p.follower_count || 0,
      genres: p.genres || [],
      gig_count: gigCount || 0,
      venues_played: venuesPlayed,
    });
  }

  // Score and rank
  const scored = targets.map((t) => ({
    ...t,
    score:
      t.gig_count * 3 +
      t.follower_count * 0.001 +
      (t.photo_url ? 2 : 0) +
      (t.instagram_handle ? 3 : 0) +
      (t.bio ? 1 : 0) +
      t.venues_played.length * 2,
  }));

  scored.sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, limit);

  log("targets", `Selected ${selected.length} targets:`);
  selected.forEach((t, i) => {
    log("targets", `  ${i + 1}. ${t.name} — ${t.gig_count} gigs, ${t.follower_count} followers, score: ${t.score.toFixed(1)}`);
  });

  return selected;
}

if (require.main === module) {
  selectTargets().catch(console.error);
}
