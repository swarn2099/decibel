import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getSeededRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 7) - 3;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: authData, error: authError } = await admin.auth.getUser(auth.slice(7));
  if (authError || !authData.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fanId = req.nextUrl.searchParams.get("fan_id");
  if (!fanId) {
    return NextResponse.json({ error: "fan_id required" }, { status: 400 });
  }

  // Fetch collections with same shape as /mobile/passport
  const { data: collections, error } = await admin
    .from("collections")
    .select(
      `id, verified, capture_method, event_date, created_at,
       performers!inner (id, name, slug, photo_url, genres, city),
       venues (name)`
    )
    .eq("fan_id", fanId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get fan_tiers and founder_badges for this fan
  const [{ data: tiers }, { data: founderBadges }] = await Promise.all([
    admin
      .from("fan_tiers")
      .select("performer_id, scan_count, current_tier")
      .eq("fan_id", fanId),
    admin
      .from("founder_badges")
      .select("performer_id")
      .eq("fan_id", fanId),
  ]);

  const foundedPerformerIds = new Set(
    (founderBadges ?? []).map((f: { performer_id: string }) => f.performer_id)
  );

  const tierMap = new Map(
    (tiers ?? []).map((t: Record<string, unknown>) => [
      t.performer_id as string,
      {
        scan_count: t.scan_count as number,
        current_tier: t.current_tier as string,
      },
    ])
  );

  // Map to same shape as passport stamps
  const stamps = (collections ?? []).map((c: Record<string, unknown>) => {
    const performer = Array.isArray(c.performers)
      ? c.performers[0]
      : c.performers;
    const venue = Array.isArray(c.venues) ? c.venues[0] : c.venues;
    const performerId = (performer as Record<string, unknown>)?.id as string;
    const tier = tierMap.get(performerId);

    return {
      id: c.id,
      performer: {
        id: performerId,
        name: ((performer as Record<string, unknown>)?.name as string) ?? "Unknown",
        slug: ((performer as Record<string, unknown>)?.slug as string) ?? "",
        photo_url: ((performer as Record<string, unknown>)?.photo_url as string) ?? null,
        genres: ((performer as Record<string, unknown>)?.genres as string[]) ?? [],
        city: ((performer as Record<string, unknown>)?.city as string) ?? "",
      },
      venue: venue
        ? { name: (venue as Record<string, unknown>).name as string }
        : null,
      event_date: c.event_date ?? null,
      capture_method: c.capture_method,
      verified: c.verified,
      created_at: c.created_at,
      scan_count: tier?.scan_count ?? null,
      current_tier: tier?.current_tier ?? null,
      is_founder: foundedPerformerIds.has(performerId),
      rotation: getSeededRotation(c.id as string),
    };
  });

  return NextResponse.json({ collections: stamps });
}
