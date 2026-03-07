import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { PassportClient } from "./passport-client";
import type {
  PassportFan,
  PassportTimelineEntry,
} from "@/lib/types/passport";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default async function PassportPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const admin = createSupabaseAdmin();

  // Find fan by email
  const { data: fan } = await admin
    .from("fans")
    .select("id, email, name, city, created_at")
    .eq("email", user.email!)
    .single();

  if (!fan) {
    const emptyFan: PassportFan = {
      id: user.id,
      email: user.email || "",
      name: null,
      city: null,
      created_at: new Date().toISOString(),
    };
    return <PassportClient fan={emptyFan} fanSlug={user.id.slice(0, 8)} timeline={[]} />;
  }

  const passportFan: PassportFan = {
    id: fan.id,
    email: fan.email,
    name: fan.name,
    city: fan.city,
    created_at: fan.created_at,
  };

  const fanSlug = fan.name ? slugify(fan.name) : fan.id.slice(0, 8);

  // Get all collections with performer + venue data
  const { data: collections } = await admin
    .from("collections")
    .select(
      `id, event_date, capture_method, verified, created_at,
       performers!inner (id, name, slug, photo_url, genres, city),
       venues (name)`
    )
    .eq("fan_id", fan.id)
    .order("created_at", { ascending: false });

  // Get fan_tiers for tier info
  const { data: tiers } = await admin
    .from("fan_tiers")
    .select("performer_id, scan_count, current_tier")
    .eq("fan_id", fan.id);

  const tierMap = new Map(
    (tiers || []).map((t) => [t.performer_id, t])
  );

  // Build timeline entries
  const timeline: PassportTimelineEntry[] = (collections || []).map((c) => {
    const performer = c.performers as unknown as {
      id: string;
      name: string;
      slug: string;
      photo_url: string | null;
      genres: string[];
      city: string;
    };
    const venue = c.venues as unknown as { name: string } | null;
    const tier = tierMap.get(performer.id);

    return {
      id: c.id,
      performer: {
        id: performer.id,
        name: performer.name,
        slug: performer.slug,
        photo_url: performer.photo_url,
        genres: performer.genres || [],
        city: performer.city || "",
      },
      venue,
      event_date: c.event_date,
      capture_method: c.capture_method as PassportTimelineEntry["capture_method"],
      verified: c.verified,
      created_at: c.created_at,
      scan_count: tier?.scan_count ?? null,
      current_tier: tier?.current_tier ?? null,
    };
  });

  return <PassportClient fan={passportFan} fanSlug={fanSlug} timeline={timeline} />;
}
