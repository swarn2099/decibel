import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user?.email) return null;
  return data.user.email;
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

export async function POST(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spotifyId, name, photoUrl, genres, followers, monthlyListeners } =
    await req.json();

  if (!spotifyId || !name) {
    return NextResponse.json(
      { error: "spotifyId and name are required" },
      { status: 400 }
    );
  }

  // Get fan
  let { data: fan } = await admin
    .from("fans")
    .select("id")
    .eq("email", email)
    .single();

  if (!fan) {
    const { data: newFan, error } = await admin
      .from("fans")
      .insert({ email, name: null, city: null })
      .select("id")
      .single();
    if (error || !newFan) {
      return NextResponse.json({ error: "Fan profile not found" }, { status: 500 });
    }
    fan = newFan;
  }

  // Check if performer already exists
  const { data: existing } = await admin
    .from("performers")
    .select("id, name, slug")
    .eq("spotify_id", spotifyId)
    .maybeSingle();

  if (existing) {
    // Check founder
    const { data: founder } = await admin
      .from("founder_badges")
      .select("fan_id, fan:fans(name, email)")
      .eq("performer_id", existing.id)
      .maybeSingle();

    let founderName = "Someone";
    if (founder?.fan) {
      const fanRecord = Array.isArray(founder.fan)
        ? founder.fan[0]
        : founder.fan;
      if (fanRecord) {
        founderName =
          (fanRecord as Record<string, unknown>).name as string ||
          (fanRecord as Record<string, unknown>).email as string ||
          "Someone";
      }
    }

    return NextResponse.json({
      already_exists: true,
      performer: existing,
      is_founder: false,
      founder_name: founderName,
    });
  }

  // Create performer
  const slug = generateSlug(name);
  const { data: performer, error: insertError } = await admin
    .from("performers")
    .insert({
      name,
      slug,
      photo_url: photoUrl ?? null,
      genres: genres ?? [],
      follower_count: followers ?? null,
      spotify_id: spotifyId,
      spotify_url: `https://open.spotify.com/artist/${spotifyId}`,
      monthly_listeners: monthlyListeners ?? null,
      claimed: false,
    })
    .select("id, name, slug")
    .single();

  if (insertError || !performer) {
    return NextResponse.json(
      { error: `Failed to create performer: ${insertError?.message ?? "Unknown"}` },
      { status: 500 }
    );
  }

  // Add to collection
  await admin.from("collections").insert({
    fan_id: fan.id,
    performer_id: performer.id,
    capture_method: "online",
    verified: false,
  });

  // Founder badge (under 1M followers)
  let isFounder = false;
  if ((followers ?? 0) < 1_000_000) {
    const { error: founderErr } = await admin
      .from("founder_badges")
      .insert({ fan_id: fan.id, performer_id: performer.id });
    isFounder = !founderErr;
  }

  // Upsert fan_tiers
  await admin.from("fan_tiers").upsert(
    {
      fan_id: fan.id,
      performer_id: performer.id,
      scan_count: 1,
      current_tier: "network",
    },
    { onConflict: "fan_id,performer_id" }
  );

  return NextResponse.json({
    already_exists: false,
    performer,
    is_founder: isFounder,
    founder_name: null,
  });
}
