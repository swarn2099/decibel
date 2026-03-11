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
    performer_ids?: string[];
    local_date?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { venue_id, performer_ids, local_date } = body;

  // Validate required fields
  if (!venue_id || typeof venue_id !== "string") {
    return NextResponse.json({ error: "venue_id is required" }, { status: 400 });
  }
  if (!Array.isArray(performer_ids) || performer_ids.length === 0) {
    return NextResponse.json(
      { error: "performer_ids must be a non-empty array" },
      { status: 400 }
    );
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

  // Duplicate check: same fan + venue + date
  const { data: existingStamps } = await admin
    .from("collections")
    .select("id, performer_id, performer:performers(id, name, photo_url)")
    .eq("fan_id", fan.id)
    .eq("venue_id", venue_id)
    .eq("event_date", local_date);

  if (existingStamps && existingStamps.length > 0) {
    const stamps = existingStamps.map((s) => {
      const perf = Array.isArray(s.performer) ? s.performer[0] : s.performer;
      return {
        performer_id: s.performer_id,
        performer_name: (perf as Record<string, unknown> | null)?.name ?? null,
        performer_photo: (perf as Record<string, unknown> | null)?.photo_url ?? null,
      };
    });

    // Get venue name
    const { data: venue } = await admin
      .from("venues")
      .select("name")
      .eq("id", venue_id)
      .single();

    return NextResponse.json({
      already_checked_in: true,
      existing_stamps: stamps,
      venue_name: venue?.name ?? null,
      event_date: local_date,
    });
  }

  // Fetch performer details for response
  const { data: performers, error: perfError } = await admin
    .from("performers")
    .select("id, name, photo_url")
    .in("id", performer_ids);

  if (perfError || !performers || performers.length === 0) {
    return NextResponse.json({ error: "One or more performers not found" }, { status: 404 });
  }

  // Insert collection rows for each performer
  const collectionInserts = performers.map((p) => ({
    fan_id: fan.id,
    performer_id: p.id,
    venue_id,
    event_date: local_date,
    capture_method: "location",
    verified: true,
  }));

  const { error: insertError } = await admin
    .from("collections")
    .insert(collectionInserts);

  if (insertError) {
    // Handle unique constraint violation gracefully (concurrent check-in)
    if (insertError.code === "23505") {
      return NextResponse.json({
        already_checked_in: true,
        existing_stamps: [],
        venue_name: null,
        event_date: local_date,
      });
    }
    return NextResponse.json(
      { error: `Failed to create stamps: ${insertError.message}` },
      { status: 500 }
    );
  }

  // Upsert fan_tiers for each performer (increment scan_count)
  for (const p of performers) {
    await admin.from("fan_tiers").upsert(
      {
        fan_id: fan.id,
        performer_id: p.id,
        scan_count: 1,
        current_tier: "network",
      },
      { onConflict: "fan_id,performer_id" }
    );
  }

  // Get venue name
  const { data: venue } = await admin
    .from("venues")
    .select("name")
    .eq("id", venue_id)
    .single();

  const stamps = performers.map((p) => ({
    performer_id: p.id,
    performer_name: p.name,
    performer_photo: p.photo_url,
  }));

  return NextResponse.json({
    stamps,
    venue_name: venue?.name ?? null,
    event_date: local_date,
    already_checked_in: false,
  });
}
