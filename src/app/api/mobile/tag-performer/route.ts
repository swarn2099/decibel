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

export async function POST(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    venue_id?: string;
    performer_id?: string;
    local_date?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { venue_id, performer_id, local_date } = body;

  // Validate required fields
  if (!venue_id || typeof venue_id !== "string") {
    return NextResponse.json({ error: "venue_id is required" }, { status: 400 });
  }
  if (!performer_id || typeof performer_id !== "string") {
    return NextResponse.json({ error: "performer_id is required" }, { status: 400 });
  }
  if (!local_date || !/^\d{4}-\d{2}-\d{2}$/.test(local_date)) {
    return NextResponse.json(
      { error: "local_date is required and must be in YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  // Look up fan by email
  const { data: fan, error: fanError } = await admin
    .from("fans")
    .select("id")
    .eq("email", email)
    .single();

  if (fanError || !fan) {
    return NextResponse.json({ error: "Fan profile not found" }, { status: 404 });
  }

  // Fetch performer details
  const { data: performer, error: perfError } = await admin
    .from("performers")
    .select("id, name, photo_url")
    .eq("id", performer_id)
    .single();

  if (perfError || !performer) {
    return NextResponse.json({ error: "Performer not found" }, { status: 404 });
  }

  // Fetch venue details
  const { data: venue, error: venueError } = await admin
    .from("venues")
    .select("id, name")
    .eq("id", venue_id)
    .single();

  if (venueError || !venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  // Insert into user_tagged_events with upsert (unique: fan+venue+performer+date)
  const { error: tagError } = await admin.from("user_tagged_events").upsert(
    {
      fan_id: fan.id,
      venue_id,
      performer_id,
      event_date: local_date,
    },
    { onConflict: "fan_id,venue_id,performer_id,event_date" }
  );

  if (tagError) {
    // If the table doesn't exist yet, log error but continue to create the collection
    console.error("user_tagged_events insert error:", tagError.message);
    if (!tagError.message.includes("does not exist")) {
      return NextResponse.json(
        { error: `Failed to tag performer: ${tagError.message}` },
        { status: 500 }
      );
    }
  }

  // Check for existing collection to prevent duplicate
  const { data: existingCollection } = await admin
    .from("collections")
    .select("id")
    .eq("fan_id", fan.id)
    .eq("performer_id", performer_id)
    .eq("venue_id", venue_id)
    .eq("event_date", local_date)
    .maybeSingle();

  if (!existingCollection) {
    const { error: collectionError } = await admin.from("collections").insert({
      fan_id: fan.id,
      performer_id,
      venue_id,
      event_date: local_date,
      capture_method: "location",
      verified: true,
    });

    if (collectionError && collectionError.code !== "23505") {
      return NextResponse.json(
        { error: `Failed to create stamp: ${collectionError.message}` },
        { status: 500 }
      );
    }

    // Upsert fan_tiers (increment scan_count)
    await admin.from("fan_tiers").upsert(
      {
        fan_id: fan.id,
        performer_id,
        scan_count: 1,
        current_tier: "network",
      },
      { onConflict: "fan_id,performer_id" }
    );
  }

  // Count crowdsourced lineup for this venue + date (from user_tagged_events)
  let crowdsourced_lineup_count = 0;
  const { count, error: countError } = await admin
    .from("user_tagged_events")
    .select("performer_id", { count: "exact", head: true })
    .eq("venue_id", venue_id)
    .eq("event_date", local_date);

  if (!countError && count !== null) {
    crowdsourced_lineup_count = count;
  }

  return NextResponse.json({
    stamp: {
      performer_id: performer.id,
      performer_name: performer.name,
      performer_photo: performer.photo_url,
    },
    venue_name: venue.name,
    event_date: local_date,
    crowdsourced_lineup_count,
  });
}
