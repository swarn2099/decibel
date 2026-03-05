import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export async function renderToImage(
  htmlContent: string,
  outputPath: string,
  width = 1080,
  height = 1080
) {
  mkdirSync(dirname(outputPath), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewportSize({ width, height });

  // Load the HTML with embedded styles
  await page.setContent(htmlContent, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  await page.screenshot({
    path: outputPath,
    type: "png",
    clip: { x: 0, y: 0, width, height },
  });

  await browser.close();
}

export function saveCaption(outputPath: string, caption: string) {
  const captionPath = outputPath.replace(".png", ".txt");
  writeFileSync(captionPath, caption, "utf-8");
}

// Base HTML template with Decibel branding
export function wrapInTemplate(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 1080px;
      height: 1080px;
      background: #0B0B0F;
      color: #ededed;
      font-family: 'Poppins', sans-serif;
      overflow: hidden;
    }

    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px;
      position: relative;
    }

    .watermark {
      position: absolute;
      bottom: 40px;
      right: 50px;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 2px;
      background: linear-gradient(to right, #FF4D6A, #9B6DFF);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .gradient-line {
      width: 80px;
      height: 3px;
      background: linear-gradient(to right, #FF4D6A, #9B6DFF);
      border-radius: 2px;
    }

    .pink { color: #FF4D6A; }
    .purple { color: #9B6DFF; }
    .blue { color: #4D9AFF; }
    .teal { color: #00D4AA; }
    .yellow { color: #FFD700; }
    .gray { color: #8E8E9A; }
    .light-gray { color: #55556A; }

    .card {
      background: #15151C;
      border-radius: 20px;
      padding: 40px;
      border: 1px solid rgba(85, 85, 106, 0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    ${bodyHtml}
    <div class="watermark">DECIBEL</div>
  </div>
</body>
</html>`;
}
