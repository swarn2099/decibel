import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://decibel-three.vercel.app";

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/passport?spotify=error", siteUrl));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = `${siteUrl}/api/spotify/callback`;

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/passport?spotify=error", siteUrl));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/passport?spotify=error", siteUrl));
    }

    // Store refresh token for server-side Spotify API calls (search, etc.)
    if (refreshToken) {
      const admin = createSupabaseAdmin();
      await admin.from("spotify_tokens").upsert(
        { id: 1, refresh_token: refreshToken, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
    }

    // Set access token in httpOnly cookie (expires in 1 hour matching Spotify token expiry)
    const response = NextResponse.redirect(
      new URL("/passport?spotify=connected", siteUrl)
    );
    response.cookies.set("spotify_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 3600, // 1 hour
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/passport?spotify=error", siteUrl));
  }
}
