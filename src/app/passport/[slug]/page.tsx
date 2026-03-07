import { createSupabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { PassportClient } from "../passport-client";
import { generateFanSlug } from "@/lib/fan-slug";
import type {
  PassportFan,
  PassportTimelineEntry,
} from "@/lib/types/passport";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

async function findFanBySlug(slug: string) {
  const admin = createSupabaseAdmin();
  const { data: fans } = await admin
    .from("fans")
    .select("id, email, name, city, created_at")
    .limit(500);

  if (!fans) return null;

  return fans.find((fan) => generateFanSlug(fan) === slug) || null;
}

async function getPassportData(fanId: string) {
  const admin = createSupabaseAdmin();

  const { data: collections } = await admin
    .from("collections")
    .select(
      `id, event_date, capture_method, verified, created_at,
       performers!inner (id, name, slug, photo_url, genres, city),
       venues (name)`
    )
    .eq("fan_id", fanId)
    .order("created_at", { ascending: false });

  const { data: tiers } = await admin
    .from("fan_tiers")
    .select("performer_id, scan_count, current_tier")
    .eq("fan_id", fanId);

  const tierMap = new Map(
    (tiers || []).map((t) => [t.performer_id, t])
  );

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

  return timeline;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const fan = await findFanBySlug(slug);

  if (!fan) {
    return { title: "Passport Not Found | DECIBEL" };
  }

  const timeline = await getPassportData(fan.id);
  const uniqueArtists = new Set(timeline.map((t) => t.performer.id)).size;
  const uniqueVenues = new Set(
    timeline.filter((t) => t.venue).map((t) => t.venue!.name)
  ).size;
  const name = fan.name || "Anonymous Fan";

  const ogImageUrl = `/api/og/passport?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}&artists=${uniqueArtists}&shows=${timeline.length}&venues=${uniqueVenues}`;

  return {
    title: `${name}'s Passport | DECIBEL`,
    description: `${name} has collected ${uniqueArtists} artists across ${uniqueVenues} venues. View their live music passport.`,
    openGraph: {
      title: `${name}'s Passport | DECIBEL`,
      description: `${name} has collected ${uniqueArtists} artists across ${uniqueVenues} venues. View their live music passport.`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name}'s Passport | DECIBEL`,
      description: `${name} has collected ${uniqueArtists} artists across ${uniqueVenues} venues.`,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicPassportPage({ params }: Props) {
  const { slug } = await params;
  const fan = await findFanBySlug(slug);

  if (!fan) notFound();

  const passportFan: PassportFan = {
    id: fan.id,
    email: fan.email,
    name: fan.name,
    city: fan.city,
    created_at: fan.created_at,
  };

  const timeline = await getPassportData(fan.id);

  return (
    <PassportClient
      fan={passportFan}
      fanSlug={slug}
      timeline={timeline}
      isPublic
    />
  );
}
