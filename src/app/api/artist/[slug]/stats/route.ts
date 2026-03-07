import { createSupabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

type Params = Promise<{ slug: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

  // Look up performer by slug
  const { data: performer, error: perfError } = await supabase
    .from("performers")
    .select("id")
    .eq("slug", slug)
    .single();

  if (perfError || !performer) {
    return NextResponse.json({ error: "Performer not found" }, { status: 404 });
  }

  const performerId = performer.id;

  // Count collectors (verified=true) and discoverers (verified=false)
  const [collectorsRes, discoverersRes, tiersRes] = await Promise.all([
    supabase
      .from("collections")
      .select("fan_id", { count: "exact", head: true })
      .eq("performer_id", performerId)
      .eq("verified", true),
    supabase
      .from("collections")
      .select("fan_id", { count: "exact", head: true })
      .eq("performer_id", performerId)
      .eq("verified", false),
    supabase
      .from("fan_tiers")
      .select("current_tier")
      .eq("performer_id", performerId),
  ]);

  const collectors = collectorsRes.count ?? 0;
  const discoverers = discoverersRes.count ?? 0;
  const total_fans = collectors + discoverers;

  // Build tier breakdown from fan_tiers rows
  const tier_breakdown: Record<string, number> = {};
  if (tiersRes.data) {
    for (const row of tiersRes.data) {
      const tier = row.current_tier as string;
      tier_breakdown[tier] = (tier_breakdown[tier] || 0) + 1;
    }
  }

  return NextResponse.json({
    total_fans,
    collectors,
    discoverers,
    tier_breakdown,
  });
}
