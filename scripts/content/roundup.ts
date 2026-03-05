import { getSupabase, log } from "../scrapers/utils";
import { renderToImage, saveCaption, wrapInTemplate } from "./renderer";
import { resolve } from "path";

export async function generateRoundup(daysBack = 7) {
  const supabase = getSupabase();

  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data: events } = await supabase
    .from("events")
    .select(`
      event_date,
      performers (name, slug),
      venues (name)
    `)
    .gte("event_date", since.toISOString().split("T")[0])
    .order("event_date", { ascending: false })
    .limit(20);

  if (!events || events.length === 0) {
    log("roundup", "No events found for this period");
    return null;
  }

  // Deduplicate and format
  const eventLines = events.slice(0, 8).map((e) => {
    const performer = (e.performers as unknown as { name: string })?.name || "TBA";
    const venue = (e.venues as unknown as { name: string })?.name || "";
    const date = new Date(e.event_date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return { performer, venue, date };
  });

  const uniquePerformers = new Set(eventLines.map((e) => e.performer));
  const uniqueVenues = new Set(eventLines.map((e) => e.venue).filter(Boolean));

  const eventsHtml = eventLines
    .map(
      (e) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid rgba(85, 85, 106, 0.15);">
      <div>
        <div style="font-size: 18px; font-weight: 600;">${e.performer}</div>
        <div class="gray" style="font-size: 13px;">${e.venue}</div>
      </div>
      <div class="light-gray" style="font-size: 13px; white-space: nowrap;">${e.date}</div>
    </div>`
    )
    .join("");

  const html = wrapInTemplate(`
    <div style="text-align: center; margin-bottom: 30px;">
      <p class="pink" style="font-size: 14px; font-weight: 600; letter-spacing: 3px; margin-bottom: 8px;">THIS WEEK IN</p>
      <h1 style="font-size: 52px; font-weight: 700;">CHICAGO</h1>
      <div class="gradient-line" style="margin: 16px auto;"></div>
    </div>
    <div style="width: 100%; max-width: 800px;">
      ${eventsHtml}
    </div>
    <div style="display: flex; gap: 40px; margin-top: 30px;">
      <div style="text-align: center;">
        <div class="pink" style="font-size: 28px; font-weight: 700;">${uniquePerformers.size}</div>
        <div class="gray" style="font-size: 12px;">Artists</div>
      </div>
      <div style="text-align: center;">
        <div class="purple" style="font-size: 28px; font-weight: 700;">${uniqueVenues.size}</div>
        <div class="gray" style="font-size: 12px;">Venues</div>
      </div>
      <div style="text-align: center;">
        <div class="blue" style="font-size: 28px; font-weight: 700;">${events.length}</div>
        <div class="gray" style="font-size: 12px;">Events</div>
      </div>
    </div>
  `);

  const date = new Date().toISOString().split("T")[0];
  const outputPath = resolve(process.cwd(), `content/output/${date}-roundup.png`);

  await renderToImage(html, outputPath);

  const caption = [
    `This week in Chicago's underground: ${uniquePerformers.size} artists across ${uniqueVenues.size} venues.`,
    "",
    eventLines.slice(0, 5).map((e) => `${e.performer} @ ${e.venue}`).join("\n"),
    "",
    "The scene never sleeps.",
    "",
    "#decibel #chicagomusic #undergroundchicago #housemusic #chicagonightlife",
  ].join("\n");

  saveCaption(outputPath, caption);

  log("roundup", `Generated: ${outputPath}`);
  return outputPath;
}

if (require.main === module) {
  const days = parseInt(process.argv[2] || "7", 10);
  generateRoundup(days).catch(console.error);
}
