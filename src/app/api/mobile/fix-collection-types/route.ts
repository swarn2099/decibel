import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * One-shot migration: fix collections that were created via add-artist
 * without an explicit collection_type. Sets them to "find" if the user
 * has a founder badge, or "discovery" if they don't.
 *
 * DELETE this endpoint after running it once.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all collections with no collection_type and capture_method = 'online'
  const { data: nullTypeCols, error: fetchErr } = await admin
    .from("collections")
    .select("id, fan_id, performer_id, verified")
    .is("collection_type", null)
    .eq("capture_method", "online");

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!nullTypeCols || nullTypeCols.length === 0) {
    return NextResponse.json({ message: "No collections to fix", fixed: 0 });
  }

  // Get all founder badges to determine find vs discovery
  const { data: founderBadges } = await admin
    .from("founder_badges")
    .select("fan_id, performer_id");

  const founderSet = new Set(
    (founderBadges ?? []).map((fb) => `${fb.fan_id}:${fb.performer_id}`)
  );

  let findCount = 0;
  let discoveryCount = 0;

  for (const col of nullTypeCols) {
    const key = `${col.fan_id}:${col.performer_id}`;
    const newType = founderSet.has(key) ? "find" : "discovery";

    await admin
      .from("collections")
      .update({ collection_type: newType })
      .eq("id", col.id);

    if (newType === "find") findCount++;
    else discoveryCount++;
  }

  return NextResponse.json({
    message: "Fixed collection types",
    total: nullTypeCols.length,
    finds: findCount,
    discoveries: discoveryCount,
  });
}
