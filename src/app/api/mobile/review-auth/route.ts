import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REVIEW_EMAIL = "apple-review@decibel.app";
const REVIEW_CODE = "123456";

/**
 * POST /api/mobile/review-auth
 * Demo login for Apple App Store review. Accepts a hardcoded email + code,
 * generates a real Supabase session so the reviewer can use the app.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (email !== REVIEW_EMAIL || code !== REVIEW_CODE) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Ensure the review user exists in Supabase Auth
    let userId: string;

    const { data: existing } = await admin.auth.admin.listUsers();
    const reviewUser = existing?.users?.find((u) => u.email === REVIEW_EMAIL);

    if (reviewUser) {
      userId = reviewUser.id;
    } else {
      // Create the review user
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email: REVIEW_EMAIL,
          email_confirm: true,
          user_metadata: { name: "App Reviewer" },
        });

      if (createError || !created.user) {
        return NextResponse.json(
          { error: "Failed to create review account" },
          { status: 500 }
        );
      }
      userId = created.user.id;
    }

    // Ensure a fan record exists
    const { data: fan } = await admin
      .from("fans")
      .select("id")
      .eq("email", REVIEW_EMAIL)
      .maybeSingle();

    if (!fan) {
      await admin.from("fans").insert({
        email: REVIEW_EMAIL,
        name: "App Reviewer",
      });
    }

    // Generate a session link and extract the token
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: REVIEW_EMAIL,
      });

    if (linkError || !linkData) {
      return NextResponse.json(
        { error: "Failed to generate session" },
        { status: 500 }
      );
    }

    // The generateLink response includes the hashed_token we can use
    // to verify OTP and get a real session
    const { data: session, error: verifyError } = await admin.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError || !session.session) {
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
