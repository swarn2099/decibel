import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { PassportClient } from "../passport-client";
import { generateFanSlug } from "@/lib/fan-slug";
import { BADGE_DEFINITIONS } from "@/lib/badges/definitions";
import type {
  PassportFan,
  PassportTimelineEntry,
} from "@/lib/types/passport";
import type { BadgeWithDefinition } from "@/lib/types/badges";
import type { PrivacySetting } from "@/lib/types/social";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

async function findFanBySlug(slug: string) {
  const admin = createSupabaseAdmin();
  const { data: fans } = await admin
    .from("fans")
    .select("id, email, name, city, created_at, avatar_url")
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

async function getFanBadges(fanId: string): Promise<BadgeWithDefinition[]> {
  const admin = createSupabaseAdmin();
  const { data: earnedBadges } = await admin
    .from("fan_badges")
    .select("badge_id, fan_id, earned_at")
    .eq("fan_id", fanId)
    .order("earned_at", { ascending: false });

  if (!earnedBadges || earnedBadges.length === 0) return [];

  return earnedBadges
    .map((eb) => {
      const definition = BADGE_DEFINITIONS[eb.badge_id as keyof typeof BADGE_DEFINITIONS];
      if (!definition) return null;
      return {
        badge_id: eb.badge_id,
        fan_id: eb.fan_id,
        earned_at: eb.earned_at,
        definition,
      } as BadgeWithDefinition;
    })
    .filter(Boolean) as BadgeWithDefinition[];
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

async function getPrivacySetting(fanId: string): Promise<PrivacySetting> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("fan_privacy")
    .select("visibility")
    .eq("fan_id", fanId)
    .maybeSingle();
  return (data?.visibility as PrivacySetting) || "public";
}

async function checkIsFollowing(followerId: string, followingId: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("fan_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return !!data;
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
    avatar_url: fan.avatar_url ?? null,
    spotify_connected_at: null,
  };

  // Check viewer identity
  let viewerFanId: string | undefined;
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const admin = createSupabaseAdmin();
      const { data: viewerFan } = await admin
        .from("fans")
        .select("id")
        .eq("email", user.email)
        .single();
      viewerFanId = viewerFan?.id;
    }
  } catch {
    // Not logged in -- continue as anonymous
  }

  // Check privacy setting
  const privacy = await getPrivacySetting(fan.id);
  let canViewFull = true;

  if (privacy === "private" && viewerFanId !== fan.id) {
    // Private: only the fan themselves can see full passport
    if (viewerFanId) {
      canViewFull = await checkIsFollowing(viewerFanId, fan.id);
    } else {
      canViewFull = false;
    }
  } else if (privacy === "mutual" && viewerFanId !== fan.id) {
    // Mutual: both must follow each other
    if (viewerFanId) {
      const [viewerFollows, fanFollows] = await Promise.all([
        checkIsFollowing(viewerFanId, fan.id),
        checkIsFollowing(fan.id, viewerFanId),
      ]);
      canViewFull = viewerFollows && fanFollows;
    } else {
      canViewFull = false;
    }
  }

  const [timeline, badges] = await Promise.all([
    canViewFull ? getPassportData(fan.id) : Promise.resolve([]),
    canViewFull ? getFanBadges(fan.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <PassportClient
        fan={passportFan}
        fanSlug={slug}
        timeline={timeline}
        isPublic
        badges={badges}
        viewerFanId={viewerFanId}
      />
      {!canViewFull && (
        <div className="mx-auto max-w-2xl px-4 -mt-16 pb-12">
          <div className="rounded-xl border border-light-gray/20 bg-bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-light-gray/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-[var(--text)]">
              Private Passport
            </h3>
            <p className="text-sm text-gray">
              {privacy === "private"
                ? "This passport is private. Follow this fan to see their activity."
                : "This passport is visible to mutual followers only."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
