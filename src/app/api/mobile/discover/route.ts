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

// POST /mobile/discover
// Body: { performerId: string }
// Auth: Bearer token -> fan_id
// Creates a "discovered" relationship for an existing performer
export async function POST(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { performerId } = await req.json();

  if (!performerId) {
    return NextResponse.json(
      { error: "performerId is required" },
      { status: 400 }
    );
  }

  // Verify performer exists
  const { data: performer, error: performerErr } = await admin
    .from("performers")
    .select("id, name, slug")
    .eq("id", performerId)
    .maybeSingle();

  if (performerErr || !performer) {
    return NextResponse.json({ error: "Performer not found" }, { status: 404 });
  }

  // Get or create fan
  let { data: fan } = await admin
    .from("fans")
    .select("id")
    .eq("email", email)
    .single();

  if (!fan) {
    const { data: newFan, error: fanErr } = await admin
      .from("fans")
      .insert({ email, name: null, city: null })
      .select("id")
      .single();
    if (fanErr || !newFan) {
      return NextResponse.json({ error: "Fan profile not found" }, { status: 500 });
    }
    fan = newFan;
  }

  // Check if user already has a relationship with this performer
  const { data: existing } = await admin
    .from("collections")
    .select("id, capture_method")
    .eq("fan_id", fan.id)
    .eq("performer_id", performerId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a relationship with this artist" },
      { status: 409 }
    );
  }

  // Also check founder_badges (founded relationship)
  const { data: founderBadge } = await admin
    .from("founder_badges")
    .select("id")
    .eq("fan_id", fan.id)
    .eq("performer_id", performerId)
    .maybeSingle();

  if (founderBadge) {
    return NextResponse.json(
      { error: "You already founded this artist" },
      { status: 409 }
    );
  }

  // Insert discovered relationship
  const { error: insertErr } = await admin.from("collections").insert({
    fan_id: fan.id,
    performer_id: performerId,
    capture_method: "online",
    verified: false,
  });

  if (insertErr) {
    return NextResponse.json(
      { error: `Failed to create relationship: ${insertErr.message}` },
      { status: 500 }
    );
  }

  // Upsert fan_tiers
  await admin.from("fan_tiers").upsert(
    {
      fan_id: fan.id,
      performer_id: performerId,
      scan_count: 1,
      current_tier: "network",
    },
    { onConflict: "fan_id,performer_id" }
  );

  return NextResponse.json({
    success: true,
    performer: {
      id: performer.id,
      name: performer.name,
      slug: performer.slug,
    },
  });
}
