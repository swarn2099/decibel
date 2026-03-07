import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { generateFanSlug } from "@/lib/fan-slug";
import type { ContactCheckResult } from "@/lib/types/social";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { emails } = body;

  // Validate input
  if (!Array.isArray(emails)) {
    return NextResponse.json(
      { error: "emails must be an array" },
      { status: 400 }
    );
  }

  if (emails.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 emails per request" },
      { status: 400 }
    );
  }

  // Filter to valid email strings
  const validEmails = emails.filter(
    (e): e is string => typeof e === "string" && EMAIL_REGEX.test(e)
  );

  if (validEmails.length === 0) {
    return NextResponse.json({ matches: [] });
  }

  const admin = createSupabaseAdmin();

  // Get current fan
  const { data: currentFan } = await admin
    .from("fans")
    .select("id")
    .eq("email", user.email!)
    .single();

  if (!currentFan) {
    return NextResponse.json({ error: "Fan not found" }, { status: 404 });
  }

  // Normalize emails to lowercase for matching
  const normalizedEmails = validEmails.map((e) => e.toLowerCase());

  // Query fans matching these emails
  const { data: matchedFans } = await admin
    .from("fans")
    .select("id, name, email")
    .in("email", normalizedEmails);

  if (!matchedFans || matchedFans.length === 0) {
    return NextResponse.json({ matches: [] });
  }

  // Filter out self
  const otherFans = matchedFans.filter((f) => f.id !== currentFan.id);

  if (otherFans.length === 0) {
    return NextResponse.json({ matches: [] });
  }

  // Check which ones current user already follows
  const { data: existingFollows } = await admin
    .from("fan_follows")
    .select("following_id")
    .eq("follower_id", currentFan.id)
    .in(
      "following_id",
      otherFans.map((f) => f.id)
    );

  const followingSet = new Set(
    (existingFollows || []).map((f) => f.following_id)
  );

  const matches: ContactCheckResult[] = otherFans.map((f) => ({
    email: f.email,
    fan: {
      id: f.id,
      name: f.name || f.email?.split("@")[0] || "Fan",
      slug: generateFanSlug({ name: f.name, id: f.id }),
    },
    isFollowing: followingSet.has(f.id),
  }));

  return NextResponse.json({ matches });
}
