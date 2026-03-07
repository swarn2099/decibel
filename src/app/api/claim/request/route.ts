import { createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { performer_id, email } = body as {
      performer_id?: string;
      email?: string;
    };

    if (!performer_id || !email) {
      return NextResponse.json(
        { error: "performer_id and email are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Check performer exists and is not claimed
    const { data: performer, error: perfError } = await supabase
      .from("performers")
      .select("id, claimed, name")
      .eq("id", performer_id)
      .single();

    if (perfError || !performer) {
      return NextResponse.json(
        { error: "Performer not found" },
        { status: 404 }
      );
    }

    if (performer.claimed) {
      return NextResponse.json(
        { error: "This profile has already been claimed" },
        { status: 409 }
      );
    }

    // Send magic link with claim param in redirect URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3000");

    const redirectTo = `${siteUrl}/auth/callback?claim=${performer_id}`;

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (otpError) {
      console.error("OTP error:", otpError);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Check your email for a verification link",
    });
  } catch (error) {
    console.error("Claim request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
