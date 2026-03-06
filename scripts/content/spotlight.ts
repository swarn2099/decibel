import { getSupabase, log } from "../scrapers/utils";
import { renderToImage, saveCaption, wrapInTemplate } from "./renderer";
import { resolve } from "path";

export async function generateSpotlight(performerSlug: string, outputDir?: string) {
  const supabase = getSupabase();

  const { data: performer } = await supabase
    .from("performers")
    .select("*")
    .eq("slug", performerSlug)
    .single();

  if (!performer) {
    log("spotlight", `Performer not found: ${performerSlug}`);
    return null;
  }

  // Get gig count and venues played
  const { count: gigCount } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("performer_id", performer.id);

  const { data: venuesPlayed } = await supabase
    .from("events")
    .select("venues(name)")
    .eq("performer_id", performer.id);

  const uniqueVenues = new Set(
    venuesPlayed?.map((v) => (v.venues as unknown as { name: string })?.name).filter(Boolean) || []
  );

  const { count: fanCount } = await supabase
    .from("fan_tiers")
    .select("*", { count: "exact", head: true })
    .eq("performer_id", performer.id);

  // Build HTML
  const photoHtml = performer.photo_url
    ? `<img src="${performer.photo_url}" style="width: 200px; height: 200px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(155, 109, 255, 0.3); margin-bottom: 30px;" />`
    : `<div style="width: 200px; height: 200px; border-radius: 50%; background: linear-gradient(135deg, #FF4D6A, #9B6DFF); display: flex; align-items: center; justify-content: center; font-size: 72px; font-weight: 700; margin-bottom: 30px;">${performer.name[0]}</div>`;

  const genresHtml = performer.genres?.length > 0
    ? `<div style="display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; justify-content: center;">
        ${performer.genres.map((g: string) => `<span style="background: rgba(155, 109, 255, 0.15); color: #9B6DFF; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">${g}</span>`).join("")}
       </div>`
    : "";

  const html = wrapInTemplate(`
    ${photoHtml}
    <h1 style="font-size: 48px; font-weight: 700; text-align: center; margin-bottom: 8px;">${performer.name}</h1>
    <p class="gray" style="font-size: 18px; margin-bottom: 24px;">${performer.city || "Chicago"}</p>
    ${genresHtml}
    <div style="display: flex; gap: 40px; margin-top: 40px;">
      <div style="text-align: center;">
        <div class="pink" style="font-size: 36px; font-weight: 700;">${fanCount || 0}</div>
        <div class="gray" style="font-size: 14px;">Fans</div>
      </div>
      <div style="text-align: center;">
        <div class="purple" style="font-size: 36px; font-weight: 700;">${gigCount || 0}</div>
        <div class="gray" style="font-size: 14px;">Gigs</div>
      </div>
      <div style="text-align: center;">
        <div class="blue" style="font-size: 36px; font-weight: 700;">${uniqueVenues.size}</div>
        <div class="gray" style="font-size: 14px;">Venues</div>
      </div>
    </div>
    <div class="gradient-line" style="margin-top: 40px;"></div>
  `);

  const date = new Date().toISOString().split("T")[0];
  const baseDir = outputDir || resolve(process.cwd(), "content/output");
  const outputPath = resolve(baseDir, `${date}-spotlight-${performerSlug}.png`);

  await renderToImage(html, outputPath);

  // Generate caption
  const venueNames = Array.from(uniqueVenues).slice(0, 3).join(", ");
  const caption = [
    `${performer.name} has played ${gigCount || 0} sets across ${uniqueVenues.size} Chicago venues.`,
    venueNames ? `Spotted at ${venueNames}.` : "",
    performer.genres?.length > 0 ? performer.genres.join(" / ") : "",
    "",
    "Tap the link to collect them.",
    "",
    performer.instagram_handle ? `@${performer.instagram_handle}` : "",
    "",
    "#decibel #chicagohouse #undergroundmusic #chicagonightlife #housemusic #techno",
  ]
    .filter(Boolean)
    .join("\n");

  saveCaption(outputPath, caption);

  log("spotlight", `Generated: ${outputPath}`);
  return outputPath;
}

if (require.main === module) {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npx tsx scripts/content/spotlight.ts <performer-slug>");
    process.exit(1);
  }
  generateSpotlight(slug).catch(console.error);
}
