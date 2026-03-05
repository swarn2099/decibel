import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { log } from "../scrapers/utils";
import { selectTargets, OutreachTarget } from "./select-targets";
import { renderToImage, wrapInTemplate } from "../content/renderer";

function generateDM(target: OutreachTarget): string {
  const venueRef =
    target.venues_played.length > 0
      ? `Caught your name on a few lineups at ${target.venues_played.slice(0, 2).join(" and ")}. `
      : "";

  const soundcloudRef = target.soundcloud_url
    ? `Been listening to your stuff on SoundCloud — `
    : "";

  const gigRef =
    target.gig_count > 0
      ? `${target.gig_count} gigs in the last 6 months is no joke. `
      : "";

  const genreRef =
    target.genres.length > 0
      ? `The ${target.genres[0]} scene in Chicago needs more visibility. `
      : "";

  // Multiple opening styles to keep it fresh
  const openers = [
    `Hey ${target.name.split(" ")[0]} — `,
    `Yo ${target.name.split(" ")[0]}, `,
    `${target.name.split(" ")[0]}! `,
  ];
  const opener = openers[Math.floor(Math.random() * openers.length)];

  const closers = [
    "Would love to show you what we built. No commitment, just take a look.",
    "Happy to walk you through it if you're curious. Zero strings.",
    "Check out your profile and lmk what you think. All free for performers.",
  ];
  const closer = closers[Math.floor(Math.random() * closers.length)];

  return [
    `${opener}${soundcloudRef}${venueRef}${gigRef}`,
    "",
    `${genreRef}We're building something called Decibel — it's basically a way for DJs to know exactly who's showing up to their sets and build a direct line to their real fans.`,
    "",
    `We already scraped together a profile for you with your gig history and stats. Your fans can scan a QR code at your shows and you own that data — no algorithm, no middleman.`,
    "",
    closer,
    "",
    "— Decibel team",
  ].join("\n");
}

function generateProfileScreenshotHtml(target: OutreachTarget): string {
  const photoHtml = target.photo_url
    ? `<img src="${target.photo_url}" style="width: 160px; height: 160px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(155, 109, 255, 0.3); margin-bottom: 24px;" />`
    : `<div style="width: 160px; height: 160px; border-radius: 50%; background: linear-gradient(135deg, #FF4D6A, #9B6DFF); display: flex; align-items: center; justify-content: center; font-size: 64px; font-weight: 700; margin-bottom: 24px;">${target.name[0]}</div>`;

  const genresHtml = target.genres.length > 0
    ? `<div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; justify-content: center;">
        ${target.genres.map((g) => `<span style="background: rgba(155, 109, 255, 0.15); color: #9B6DFF; padding: 4px 12px; border-radius: 16px; font-size: 13px;">${g}</span>`).join("")}
       </div>`
    : "";

  const venuesHtml = target.venues_played.length > 0
    ? `<div style="margin-top: 20px; text-align: center;">
        <p class="gray" style="font-size: 12px; margin-bottom: 8px;">VENUES</p>
        <p style="font-size: 14px; color: #8E8E9A;">${target.venues_played.slice(0, 4).join(" · ")}</p>
       </div>`
    : "";

  return wrapInTemplate(`
    <div style="text-align: center;">
      <p class="gray" style="font-size: 12px; letter-spacing: 2px; margin-bottom: 20px;">YOUR DECIBEL PROFILE</p>
      ${photoHtml}
      <h1 style="font-size: 40px; font-weight: 700; margin-bottom: 6px;">${target.name}</h1>
      <p class="gray" style="font-size: 16px;">Chicago</p>
      ${genresHtml}
      <div style="display: flex; gap: 40px; margin-top: 32px; justify-content: center;">
        <div style="text-align: center;">
          <div class="pink" style="font-size: 32px; font-weight: 700;">${target.gig_count}</div>
          <div class="gray" style="font-size: 13px;">Gigs</div>
        </div>
        <div style="text-align: center;">
          <div class="purple" style="font-size: 32px; font-weight: 700;">${target.follower_count}</div>
          <div class="gray" style="font-size: 13px;">Followers</div>
        </div>
        <div style="text-align: center;">
          <div class="blue" style="font-size: 32px; font-weight: 700;">${target.venues_played.length}</div>
          <div class="gray" style="font-size: 13px;">Venues</div>
        </div>
      </div>
      ${venuesHtml}
      <div class="gradient-line" style="margin: 30px auto 0;"></div>
    </div>
  `);
}

export async function generateMessages(targets?: OutreachTarget[]) {
  if (!targets) {
    targets = await selectTargets(10);
  }

  if (targets.length === 0) {
    log("messages", "No targets to generate messages for");
    return;
  }

  const outDir = resolve(process.cwd(), "content/output/outreach");
  mkdirSync(outDir, { recursive: true });

  for (const target of targets) {
    // Generate DM text
    const dm = generateDM(target);
    const dmPath = resolve(outDir, `${target.slug}-dm.txt`);
    writeFileSync(dmPath, dm, "utf-8");
    log("messages", `DM: ${dmPath}`);

    // Generate profile screenshot
    const html = generateProfileScreenshotHtml(target);
    const screenshotPath = resolve(outDir, `${target.slug}-profile-screenshot.png`);
    try {
      await renderToImage(html, screenshotPath);
      log("messages", `Screenshot: ${screenshotPath}`);
    } catch (err) {
      console.error(`Failed screenshot for ${target.name}:`, err);
    }
  }

  log("messages", `Done. Generated ${targets.length} outreach packages.`);
}

if (require.main === module) {
  generateMessages().catch(console.error);
}
