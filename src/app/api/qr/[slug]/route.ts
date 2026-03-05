import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  // Use the request host to build the collect URL
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const collectUrl = `${protocol}://${host}/collect/${slug}`;

  try {
    const qrBuffer = await QRCode.toBuffer(collectUrl, {
      width: 900,
      margin: 2,
      color: {
        dark: "#FFFFFF",
        light: "#0B0B0F",
      },
      errorCorrectionLevel: "H",
    });

    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${slug}-qr.png"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
