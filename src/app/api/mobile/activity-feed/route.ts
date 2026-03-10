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

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0");
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "20"),
    50
  );
  const from = page * limit;
  const to = from + limit - 1;

  // Get recent collections across ALL fans, joined with fan + performer + venue
  const { data: collections, error } = await admin
    .from("collections")
    .select(
      `id, fan_id, verified, capture_method, created_at,
       fans!inner (id, name, avatar_url),
       performers!inner (id, name, slug, photo_url, genres),
       venues (name)`
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get founder badges for all performer_ids in this batch
  const performerIds = [
    ...new Set(
      (collections ?? []).map((c: Record<string, unknown>) => {
        const perf = Array.isArray(c.performers)
          ? c.performers[0]
          : c.performers;
        return (perf as Record<string, unknown>)?.id as string;
      })
    ),
  ];

  const fanIds = [
    ...new Set(
      (collections ?? []).map((c: Record<string, unknown>) => c.fan_id as string)
    ),
  ];

  // Get founder badges for these fan+performer combos
  const { data: founderBadges } = await admin
    .from("founder_badges")
    .select("fan_id, performer_id")
    .in("fan_id", fanIds.length > 0 ? fanIds : ["none"])
    .in("performer_id", performerIds.length > 0 ? performerIds : ["none"]);

  const founderSet = new Set(
    (founderBadges ?? []).map(
      (f: { fan_id: string; performer_id: string }) =>
        `${f.fan_id}:${f.performer_id}`
    )
  );

  // Helper: detect garbled names (DB IDs or slugs leaking as display names)
  const isGarbledName = (name: string | null | undefined): boolean => {
    if (!name) return true;
    // Matches UUIDs, base64-like strings, or strings with no spaces that are too long
    if (/^[a-zA-Z0-9_-]{15,}$/.test(name)) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}/.test(name)) return true;
    return false;
  };

  const allItems = (collections ?? []).map((c: Record<string, unknown>) => {
    const fan = Array.isArray(c.fans) ? c.fans[0] : c.fans;
    const performer = Array.isArray(c.performers)
      ? c.performers[0]
      : c.performers;
    const venue = Array.isArray(c.venues) ? c.venues[0] : c.venues;

    const fanId = c.fan_id as string;
    const performerId = (performer as Record<string, unknown>)?.id as string;
    const isFounder = founderSet.has(`${fanId}:${performerId}`);
    const isVerified = c.verified === true;

    // Determine action: founded > collected > discovered
    let action: "founded" | "collected" | "discovered" = "discovered";
    if (isFounder) action = "founded";
    else if (isVerified) action = "collected";

    const performerName = (performer as Record<string, unknown>)?.name as string;

    return {
      id: c.id as string,
      fan_id: fanId,
      fan_name:
        ((fan as Record<string, unknown>)?.name as string) || "Anonymous",
      fan_avatar:
        ((fan as Record<string, unknown>)?.avatar_url as string) || null,
      action,
      performer_id: performerId,
      performer_name: performerName || "Unknown",
      performer_slug:
        ((performer as Record<string, unknown>)?.slug as string) || "",
      performer_image:
        ((performer as Record<string, unknown>)?.photo_url as string) || null,
      performer_genres:
        ((performer as Record<string, unknown>)?.genres as string[]) || null,
      venue_name:
        ((venue as Record<string, unknown>)?.name as string) || null,
      timestamp: c.created_at as string,
      _garbled: isGarbledName(performerName),
    };
  });

  // Filter out entries with garbled performer names
  const filtered = allItems.filter((item) => !item._garbled);

  // Dedup by fan_id + performer_id + action — keep most recent (first, since ordered desc)
  const seen = new Set<string>();
  const items = filtered
    .filter((item) => {
      const key = `${item.fan_id}:${item.performer_id}:${item.action}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ _garbled, ...rest }) => rest);

  return NextResponse.json({
    items,
    has_more: (collections ?? []).length === limit,
  });
}
