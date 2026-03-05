import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { log } from "../scrapers/utils";
import { selectTargets, OutreachTarget } from "./select-targets";

function generateFollowUp3Day(target: OutreachTarget): string {
  const name = target.name.split(" ")[0];

  const angles = [
    // Social proof angle
    [
      `Hey ${name} — just following up on my last message about Decibel.`,
      "",
      `Quick update: we've got ${target.venues_played.length > 0 ? `profiles built for artists playing at ${target.venues_played[0]}` : "a bunch of Chicago DJs already on the platform"}. Your profile is ready to claim whenever you want.`,
      "",
      "The idea is simple — you get a QR code, fans scan it at your shows, and you build a verified audience list. No app download needed on their end.",
      "",
      "Happy to send you a preview of your profile if you're interested.",
    ],
    // Value angle
    [
      `${name} — one more thought on the Decibel thing.`,
      "",
      "Most DJs don't know who 90% of their crowd is. Instagram followers aren't the same as people who actually showed up.",
      "",
      `We're giving you a way to capture that. Free for performers, always. ${target.gig_count > 3 ? `With ${target.gig_count} gigs recently, you'd build a solid list fast.` : ""}`,
      "",
      "Lmk if you want to check it out.",
    ],
    // Casual angle
    [
      `${name}! Tried reaching out last week about Decibel — all good if you missed it.`,
      "",
      `Short version: we built a tool that lets DJs know who's at their shows and message them directly. Think of it like your own fan CRM but underground, not corporate.`,
      "",
      "Your profile's already set up. Just say the word and I'll send you the link.",
    ],
  ];

  const angle = angles[Math.floor(Math.random() * angles.length)];
  return angle.join("\n");
}

function generateFollowUp7Day(target: OutreachTarget): string {
  const name = target.name.split(" ")[0];

  return [
    `Last one, ${name} — promise I'm not trying to spam you.`,
    "",
    "We built your Decibel profile from public data (gig history, SoundCloud, etc). Attaching a screenshot so you can see what it looks like.",
    "",
    "If you ever want to claim it and start capturing fans at your shows, it's there waiting. Completely free, no catch.",
    "",
    "Either way, keep killing it out there. See you on the dancefloor.",
    "",
    "— Decibel",
  ].join("\n");
}

export async function generateFollowUps(
  targets?: OutreachTarget[],
  type: "3day" | "7day" = "3day"
) {
  if (!targets) {
    targets = await selectTargets(10);
  }

  if (targets.length === 0) {
    log("followups", "No targets");
    return;
  }

  const outDir = resolve(process.cwd(), "content/output/outreach");
  mkdirSync(outDir, { recursive: true });

  for (const target of targets) {
    const message =
      type === "3day"
        ? generateFollowUp3Day(target)
        : generateFollowUp7Day(target);

    const path = resolve(outDir, `${target.slug}-followup-${type}.txt`);
    writeFileSync(path, message, "utf-8");
    log("followups", `${type}: ${path}`);
  }

  log("followups", `Done. Generated ${targets.length} ${type} follow-ups.`);
}

if (require.main === module) {
  const type = (process.argv[2] || "3day") as "3day" | "7day";
  generateFollowUps(undefined, type).catch(console.error);
}
