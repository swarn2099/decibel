import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { TIER_THRESHOLDS } from "@/lib/tiers";

type Params = Promise<{ slug: string }>;

interface JourneyResponse {
  authenticated: boolean;
  state: "none" | "discovered" | "collecting" | "devoted" | "inner_circle";
  scan_count: number;
  current_tier: string | null;
  next_tier: string | null;
  scans_to_next: number;
}

const TIER_ORDER = ["network", "early_access", "secret", "inner_circle"] as const;

function getNextTier(currentTier: string | null): string | null {
  if (!currentTier) return "network";
  const idx = TIER_ORDER.indexOf(currentTier as (typeof TIER_ORDER)[number]);
  if (idx === -1 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

function getScansToNext(scanCount: number, nextTier: string | null): number {
  if (!nextTier) return 0;
  const threshold = TIER_THRESHOLDS[nextTier];
  if (!threshold) return 0;
  return Math.max(0, threshold - scanCount);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { slug } = await params;

    // Auth check
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json<JourneyResponse>({
        authenticated: false,
        state: "none",
        scan_count: 0,
        current_tier: null,
        next_tier: null,
        scans_to_next: 0,
      });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Look up performer by slug
    const { data: performer } = await supabaseAdmin
      .from("performers")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!performer) {
      return NextResponse.json<JourneyResponse>({
        authenticated: true,
        state: "none",
        scan_count: 0,
        current_tier: null,
        next_tier: null,
        scans_to_next: 0,
      });
    }

    // Look up fan by user email
    const { data: fan } = await supabaseAdmin
      .from("fans")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!fan) {
      return NextResponse.json<JourneyResponse>({
        authenticated: true,
        state: "none",
        scan_count: 0,
        current_tier: null,
        next_tier: null,
        scans_to_next: 0,
      });
    }

    // Query collections for this fan + performer
    const { data: collections } = await supabaseAdmin
      .from("collections")
      .select("id, verified")
      .eq("fan_id", fan.id)
      .eq("performer_id", performer.id);

    // Query fan_tiers
    const { data: tierData } = await supabaseAdmin
      .from("fan_tiers")
      .select("scan_count, current_tier")
      .eq("fan_id", fan.id)
      .eq("performer_id", performer.id)
      .maybeSingle();

    const scanCount = tierData?.scan_count ?? 0;
    const currentTier = tierData?.current_tier ?? null;

    // Determine journey state
    let state: JourneyResponse["state"] = "none";

    if (!collections || collections.length === 0) {
      state = "none";
    } else {
      const hasVerified = collections.some((c) => c.verified);

      if (!hasVerified) {
        state = "discovered";
      } else if (currentTier === "inner_circle") {
        state = "inner_circle";
      } else if (currentTier === "secret") {
        state = "devoted";
      } else {
        // network or early_access
        state = "collecting";
      }
    }

    const nextTier = getNextTier(currentTier);
    const scansToNext = getScansToNext(scanCount, nextTier);

    return NextResponse.json<JourneyResponse>({
      authenticated: true,
      state,
      scan_count: scanCount,
      current_tier: currentTier,
      next_tier: nextTier,
      scans_to_next: scansToNext,
    });
  } catch {
    return NextResponse.json<JourneyResponse>(
      {
        authenticated: false,
        state: "none",
        scan_count: 0,
        current_tier: null,
        next_tier: null,
        scans_to_next: 0,
      },
      { status: 500 }
    );
  }
}
