import { createSupabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { generateFanSlug } from "@/lib/fan-slug";
import { BADGE_DEFINITIONS } from "@/lib/badges/definitions";
import { AppStoreCTA } from "@/components/app-store-badge";
import { Footer } from "@/components/footer";
import { SITE_URL } from "@/lib/config";
import { PerformerImage } from "@/components/performer-image";
import type { BadgeWithDefinition } from "@/lib/types/badges";
import type { Metadata } from "next";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

interface Fan {
  id: string;
  email: string;
  name: string | null;
  city: string | null;
  created_at: string;
  avatar_url: string | null;
}

interface CollectionEntry {
  id: string;
  verified: boolean;
  created_at: string;
  performer: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
  };
}

async function findFanBySlug(slug: string): Promise<Fan | null> {
  const admin = createSupabaseAdmin();
  const { data: fans } = await admin
    .from("fans")
    .select("id, email, name, city, created_at, avatar_url")
    .limit(500);

  if (!fans) return null;
  return fans.find((fan) => generateFanSlug(fan) === slug) || null;
}

async function getCollections(fanId: string): Promise<CollectionEntry[]> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("collections")
    .select(
      "id, verified, created_at, performers!inner(id, name, slug, photo_url)"
    )
    .eq("fan_id", fanId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  // Deduplicate by performer
  const seen = new Set<string>();
  const entries: CollectionEntry[] = [];
  for (const c of data) {
    const performer = (
      Array.isArray(c.performers) ? c.performers[0] : c.performers
    ) as CollectionEntry["performer"];
    if (!performer || seen.has(performer.id)) continue;
    seen.add(performer.id);
    entries.push({
      id: c.id,
      verified: c.verified,
      created_at: c.created_at,
      performer,
    });
  }
  return entries;
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
      const definition =
        BADGE_DEFINITIONS[eb.badge_id as keyof typeof BADGE_DEFINITIONS];
      if (!definition) return null;
      return { ...eb, definition } as BadgeWithDefinition;
    })
    .filter(Boolean) as BadgeWithDefinition[];
}

async function getFounderBadges(
  fanId: string
): Promise<{ performer_name: string; performer_slug: string }[]> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("founder_badges")
    .select("performers(name, slug)")
    .eq("fan_id", fanId);

  if (!data) return [];
  return data
    .map((fb) => {
      const p = (Array.isArray(fb.performers)
        ? fb.performers[0]
        : fb.performers) as { name: string; slug: string } | null;
      return p ? { performer_name: p.name, performer_slug: p.slug } : null;
    })
    .filter(Boolean) as { performer_name: string; performer_slug: string }[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const fan = await findFanBySlug(slug);
  if (!fan) return { title: "Passport Not Found | DECIBEL" };

  const collections = await getCollections(fan.id);
  const badges = await getFanBadges(fan.id);
  const name = fan.name || "Anonymous Fan";

  const ogImageUrl = `/api/og/passport?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}&artists=${collections.length}&shows=${collections.length}&venues=0`;

  return {
    title: `${name}'s Decibel Passport`,
    description: `${collections.length} artists collected. ${badges.length} badges earned.`,
    openGraph: {
      title: `${name}'s Decibel Passport`,
      description: `${collections.length} artists collected. ${badges.length} badges earned.`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      url: `${SITE_URL}/passport/${slug}`,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name}'s Decibel Passport`,
      description: `${collections.length} artists collected. ${badges.length} badges earned.`,
      images: [ogImageUrl],
    },
  };
}

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Border color based on collection type
function getCollectionBorder(verified: boolean, isFounder: boolean): string {
  if (isFounder) return "ring-yellow";
  if (verified) return "ring-pink";
  return "ring-purple";
}

export default async function PublicPassportPage({ params }: Props) {
  const { slug } = await params;
  const fan = await findFanBySlug(slug);
  if (!fan) notFound();

  const [collections, badges, founderBadges] = await Promise.all([
    getCollections(fan.id),
    getFanBadges(fan.id),
    getFounderBadges(fan.id),
  ]);

  const founderPerformerIds = new Set(
    founderBadges.map((fb) => fb.performer_slug)
  );
  const name = fan.name || "Anonymous Fan";
  const totalBadges = badges.length;

  return (
    <main className="min-h-dvh bg-bg">
      {/* ───── Header ───── */}
      <div className="flex flex-col items-center px-6 pt-16 pb-8 text-center sm:pt-20">
        {/* Back to home */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-xs"
        >
          <span className="bg-gradient-to-r from-pink via-purple to-blue bg-clip-text font-bold text-transparent">
            DECIBEL
          </span>
        </Link>

        {/* Avatar */}
        {fan.avatar_url ? (
          <Image
            src={fan.avatar_url}
            alt={name}
            width={80}
            height={80}
            className="mb-3 h-20 w-20 rounded-full object-cover ring-2 ring-pink/30"
          />
        ) : (
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink/30 to-purple/30 text-2xl font-bold text-[var(--text-muted)] ring-2 ring-pink/30">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <h1 className="mb-1 text-2xl font-bold">{name}</h1>
        <p className="text-sm text-gray">
          Member since {formatMemberSince(fan.created_at)}
        </p>

        {/* Stats row */}
        <div className="mt-4 flex items-center gap-6 text-center">
          <div>
            <p className="text-xl font-bold text-pink">{collections.length}</p>
            <p className="text-xs text-gray">stamps</p>
          </div>
          <div>
            <p className="text-xl font-bold text-pink">{totalBadges}</p>
            <p className="text-xs text-gray">badges</p>
          </div>
          <div>
            <p className="text-xl font-bold text-pink">
              {collections.filter((c) => c.verified).length}
            </p>
            <p className="text-xs text-gray">shows</p>
          </div>
        </div>
      </div>

      {/* ───── Collection Grid ───── */}
      {collections.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
            Collection
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {collections.map((entry) => {
              const isFounder = founderPerformerIds.has(
                entry.performer.slug
              );
              const borderColor = getCollectionBorder(
                entry.verified,
                isFounder
              );
              return (
                <Link
                  key={entry.id}
                  href={`/artist/${entry.performer.slug}`}
                  className="group flex flex-col items-center gap-2"
                >
                  <div
                    className={`h-20 w-20 overflow-hidden rounded-full ring-2 ${borderColor} transition-transform group-hover:scale-105`}
                  >
                    {entry.performer.photo_url ? (
                      <PerformerImage
                        src={entry.performer.photo_url}
                        alt={entry.performer.name}
                        className="h-full w-full object-cover"
                        fallbackClassName="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple/30 to-pink/30 text-lg font-bold text-[var(--text-muted)]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple/30 to-pink/30 text-lg font-bold text-[var(--text-muted)]">
                        {entry.performer.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="w-20 truncate text-center text-xs font-medium">
                    {entry.performer.name}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ───── Badges Earned ───── */}
      {badges.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
            Badges ({badges.length}/18)
          </h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {badges.map((badge) => (
              <div
                key={badge.badge_id}
                className="flex flex-col items-center gap-1 rounded-xl border border-[rgba(255,255,255,0.06)] bg-bg-card p-3"
                title={badge.definition.description}
              >
                <span className="text-2xl">{badge.definition.icon}</span>
                <span className="w-full truncate text-center text-[10px] font-medium text-[var(--text-muted)]">
                  {badge.definition.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───── Download CTA ───── */}
      <div className="mx-auto max-w-2xl px-6 pb-12">
        <AppStoreCTA
          title="Get your own passport"
          subtitle="Track the artists you see live. Earn badges. Compete with friends."
          variant="pink"
        />
      </div>

      <Footer />
    </main>
  );
}
