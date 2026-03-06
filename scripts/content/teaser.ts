import { renderToImage, saveCaption, wrapInTemplate } from "./renderer";
import { resolve } from "path";
import { log } from "../scrapers/utils";

const FEATURES: Record<string, { title: string; subtitle: string; description: string; icon: string; caption: string }> = {
  passport: {
    title: "Your Music Passport",
    subtitle: "Every set. Every venue. One profile.",
    description: "Collect your favorite DJs by scanning their QR code at the show. The more you show up, the more you unlock.",
    icon: "🎫",
    caption: "Your nights out are about to mean something. Every scan builds your music passport — unlocking tiers, secret shows, and inner circle access.\n\nDecibel. Coming soon.\n\n#decibel #musicpassport #chicagohouse #undergroundmusic",
  },
  dashboard: {
    title: "Know Your Crowd",
    subtitle: "Real fans. Real data. Real leverage.",
    description: "See who's actually showing up. Message your top fans directly. Download your audience — no algorithm in the way.",
    icon: "📊",
    caption: "Performers: stop guessing who your fans are. Decibel shows you exactly who showed up, how often, and lets you message them directly.\n\nOwn your audience.\n\n#decibel #djtools #audiencedata #musictech",
  },
  wrapped: {
    title: "Your Year on the Floor",
    subtitle: "2024 Wrapped, but for the underground.",
    description: "How many sets did you catch? Which venues did you hit most? Who's your #1 DJ? Find out.",
    icon: "🎵",
    caption: "Spotify Wrapped is cool and all... but what about your IRL music year? How many sets did you actually attend? Which venue was your home base?\n\nDecibel Wrapped. Coming soon.\n\n#decibel #wrapped #chicagonightlife #housemusic",
  },
  tiers: {
    title: "Unlock the Underground",
    subtitle: "1 scan = in. 10 scans = inner circle.",
    description: "Network → Early Access → Secret Shows → Inner Circle. The more you show up, the deeper you go.",
    icon: "🔓",
    caption: "Not all fans are equal. Show up once, you're in the network. Show up 10 times? You're inner circle — secret shows, early access, direct messages from the artist.\n\nDecibel. The more you show up, the more you get in.\n\n#decibel #tieredaccess #undergroundmusic #chicagohouse",
  },
};

export async function generateTeaser(featureName: string, outputDir?: string) {
  const feature = FEATURES[featureName];
  if (!feature) {
    log("teaser", `Unknown feature: ${featureName}. Options: ${Object.keys(FEATURES).join(", ")}`);
    return null;
  }

  // Phone mockup with feature UI
  const html = wrapInTemplate(`
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-size: 72px; margin-bottom: 20px;">${feature.icon}</div>
      <h1 style="font-size: 42px; font-weight: 700; margin-bottom: 12px;">${feature.title}</h1>
      <p class="pink" style="font-size: 18px; font-weight: 500; margin-bottom: 24px;">${feature.subtitle}</p>
      <div class="gradient-line" style="margin: 0 auto 30px;"></div>
    </div>

    <!-- Phone mockup -->
    <div style="width: 280px; height: 500px; background: #15151C; border-radius: 32px; border: 2px solid rgba(85, 85, 106, 0.3); padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden;">
      <!-- Notch -->
      <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 120px; height: 24px; background: #0B0B0F; border-radius: 0 0 16px 16px;"></div>

      <!-- Content inside phone -->
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 36px; margin-bottom: 16px;">${feature.icon}</div>
        <p style="font-size: 14px; color: #8E8E9A; line-height: 1.6;">${feature.description}</p>
      </div>

      <!-- CTA button -->
      <div style="background: linear-gradient(to right, #FF4D6A, #9B6DFF); padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-top: auto; margin-bottom: 20px;">
        Coming Soon
      </div>
    </div>
  `);

  const date = new Date().toISOString().split("T")[0];
  const baseDir = outputDir || resolve(process.cwd(), "content/output");
  const outputPath = resolve(baseDir, `${date}-teaser-${featureName}.png`);

  await renderToImage(html, outputPath);
  saveCaption(outputPath, feature.caption);

  log("teaser", `Generated: ${outputPath}`);
  return outputPath;
}

if (require.main === module) {
  const feature = process.argv[2];
  if (!feature) {
    console.error(`Usage: npx tsx scripts/content/teaser.ts <feature>\nOptions: ${Object.keys(FEATURES).join(", ")}`);
    process.exit(1);
  }
  generateTeaser(feature).catch(console.error);
}
