import { createSupabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

type Params = Promise<{ slug: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

  // Look up performer by slug to get their genres
  const { data: performer, error: perfError } = await supabase
    .from("performers")
    .select("id, genres")
    .eq("slug", slug)
    .single();

  if (perfError || !performer) {
    return NextResponse.json({ error: "Performer not found" }, { status: 404 });
  }

  if (!performer.genres || performer.genres.length === 0) {
    return NextResponse.json({ similar: [] });
  }

  // Find performers with overlapping genres, exclude self
  const { data: similar } = await supabase
    .from("performers")
    .select("id, name, slug, photo_url, genres, city")
    .overlaps("genres", performer.genres)
    .neq("id", performer.id)
    .order("follower_count", { ascending: false, nullsFirst: false })
    .limit(8);

  return NextResponse.json({
    similar: similar ?? [],
  });
}
