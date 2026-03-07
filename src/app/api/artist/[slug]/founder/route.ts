import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type Params = Promise<{ slug: string }>;

export async function GET(
  _req: NextRequest,
  { params }: { params: Params }
) {
  const { slug } = await params;
  const admin = createSupabaseAdmin();

  // Get performer by slug
  const { data: performer } = await admin
    .from("performers")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!performer) {
    return NextResponse.json({ founder: null });
  }

  // Get founder badge
  const { data: badge } = await admin
    .from("founder_badges")
    .select("awarded_at, fans(name, email)")
    .eq("performer_id", performer.id)
    .maybeSingle();

  if (!badge) {
    return NextResponse.json({ founder: null });
  }

  const fan = badge.fans as unknown as { name: string | null; email: string } | null;

  return NextResponse.json({
    founder: {
      name: fan?.name || fan?.email?.split("@")[0] || "A fan",
      awarded_at: badge.awarded_at,
    },
  });
}
