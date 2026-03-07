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

    const admin = createSupabaseAdmin();

    // Store refresh token for server-side Spotify API calls (search, etc.)
    if (refreshToken) {
      await admin.from("spotify_tokens").upsert(
        { id: 1, refresh_token: refreshToken, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
    }

    // Store per-user refresh token so we don't need to re-auth every time
    const state = req.nextUrl.searchParams.get("state"); // user.id passed as state
    if (state && refreshToken) {
      // Look up fan by auth user id's email
      const { data: { user } } = await (await import("@/lib/supabase-server")).createSupabaseServer().then(s => s.auth.getUser());
      if (user?.email) {
        await admin
          .from("fans")
          .update({ spotify_refresh_token: refreshToken, spotify_connected_at: new Date().toISOString() })
          .eq("email", user.email);
      }
    }

    // Set access token in httpOnly cookie for the immediate import
    const response = NextResponse.redirect(
      new URL("/passport?spotify=connected", siteUrl)
    );
    response.cookies.set("spotify_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/passport?spotify=error", siteUrl));
  }
}
