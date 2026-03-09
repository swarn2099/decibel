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

export async function GET(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const performerId = req.nextUrl.searchParams.get("performerId");
  if (!performerId) {
    return NextResponse.json(
      { error: "performerId is required" },
      { status: 400 }
    );
  }

  // Fan count from collections
  const { count } = await admin
    .from("collections")
    .select("*", { count: "exact", head: true })
    .eq("performer_id", performerId);

  // Founder info
  const { data: founder } = await admin
    .from("founder_badges")
    .select("awarded_at, fan:fans(name, avatar_url)")
    .eq("performer_id", performerId)
    .maybeSingle();

  let founderInfo = null;
  if (founder) {
    const fan = Array.isArray(founder.fan) ? founder.fan[0] : founder.fan;
    if (fan) {
      founderInfo = {
        name: (fan as Record<string, unknown>).name as string | null,
        avatar_url: (fan as Record<string, unknown>).avatar_url as string | null,
        awarded_at: founder.awarded_at,
      };
    }
  }

  return NextResponse.json({
    fanCount: count ?? 0,
    founder: founderInfo,
  });
}
