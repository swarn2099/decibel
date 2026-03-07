import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://decibel-three.vercel.app";

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    console.error("[spotify/callback] OAuth error or missing code:", error);
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
      const errBody = await tokenRes.text();
      console.error("[spotify/callback] Token exchange failed:", tokenRes.status, errBody);
      return NextResponse.redirect(new URL("/passport?spotify=error", siteUrl));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (!accessToken) {
      console.error("[spotify/callback] No access token in response");
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

    // Store per-user refresh token using the auth user ID passed as state
    const authUserId = req.nextUrl.searchParams.get("state");
    if (authUserId && refreshToken) {
      // Look up user email via Supabase admin auth (no cookies needed)
      const { data: { user: authUser } } = await admin.auth.admin.getUserById(authUserId);
      if (authUser?.email) {
        await admin
          .from("fans")
          .update({ spotify_refresh_token: refreshToken, spotify_connected_at: new Date().toISOString() })
          .eq("email", authUser.email);
        console.log("[spotify/callback] Stored refresh token for", authUser.email);
      } else {
        console.warn("[spotify/callback] Could not find auth user for state:", authUserId);
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
  } catch (err) {
    console.error("[spotify/callback] Unexpected error:", err);
    return NextResponse.redirect(new URL("/passport?spotify=error", siteUrl));
  }
}
