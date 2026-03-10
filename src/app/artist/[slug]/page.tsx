import { createSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, Headphones, Music, Users, Crown, Instagram } from "lucide-react";
import Image from "next/image";
import { PerformerImage } from "@/components/performer-image";
import { AppStoreBadge, AppStoreCTA } from "@/components/app-store-badge";
import { Footer } from "@/components/footer";
import { APP_STORE_URL, SITE_URL } from "@/lib/config";

export const revalidate = 3600; // ISR: 1 hour

type Params = Promise<{ slug: string }>;

interface Performer {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  soundcloud_url: string | null;
  spotify_url: string | null;
  mixcloud_url: string | null;
  ra_url: string | null;
  instagram_handle: string | null;
  city: string | null;
  genres: string[] | null;
  follower_count: number | null;
  claimed: boolean;
}

interface Event {
  id: string;
  event_date: string;
  venue: { name: string } | null;
}

const GRADIENT_PAIRS = [
  ["from-pink", "to-purple"],
  ["from-purple", "to-blue"],
  ["from-blue", "to-teal"],
  ["from-teal", "to-yellow"],
  ["from-pink", "to-blue"],
  ["from-purple", "to-teal"],
];

function getGradient(name: string) {
  const idx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    GRADIENT_PAIRS.length;
  return GRADIENT_PAIRS[idx];
}

function cleanInstagramHandle(handle: string): string {
  if (handle.startsWith("http") || handle.includes("instagram.com")) {
    try {
      const url = new URL(handle.startsWith("http") ? handle : `https://${handle}`);
      return url.pathname.replace(/^\//, "").replace(/\/$/, "").replace(/^@/, "");
    } catch {
      return handle
        .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
        .replace(/^@/, "")
        .replace(/\/$/, "");
    }
  }
  return handle.replace(/^@/, "");
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

async function getPerformer(slug: string): Promise<Performer | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("performers")
    .select("*")
    .eq("slug", slug)
    .single();
  return data as Performer | null;
}

async function getUpcomingEvents(performerId: string): Promise<Event[]> {
  const supabase = await createSupabaseServer();
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("events")
    .select("id, event_date, venue:venues(name)")
    .eq("performer_id", performerId)
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(5);

  if (!data) return [];
  return data.map((e) => ({
    ...e,
    venue: Array.isArray(e.venue) ? e.venue[0] ?? null : e.venue,
  })) as Event[];
}

async function getFounder(
  performerId: string
): Promise<{ name: string; avatar_url: string | null } | null> {
  const supabase = await createSupabaseServer();
  const { data: badge } = await supabase
    .from("founder_badges")
    .select("fans(id, name, email, avatar_url)")
    .eq("performer_id", performerId)
    .maybeSingle();

  if (!badge) return null;
  const fan = badge.fans as unknown as {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
  if (!fan) return null;

  return {
    name: fan.name || fan.email?.split("@")[0] || "A fan",
    avatar_url: fan.avatar_url,
  };
}

async function getFanCount(performerId: string): Promise<number> {
  const supabase = await createSupabaseServer();
  const { count } = await supabase
    .from("collections")
    .select("fan_id", { count: "exact", head: true })
    .eq("performer_id", performerId);
  return count ?? 0;
}

async function getShowCount(performerId: string): Promise<number> {
  const supabase = await createSupabaseServer();
  const { count } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("performer_id", performerId);
  return count ?? 0;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const performer = await getPerformer(slug);
  if (!performer) return { title: "DECIBEL" };

  const fanCount = await getFanCount(performer.id);
  const description = `${fanCount} fans tracking ${performer.name}. Upcoming shows in Chicago.`;

  return {
    title: `${performer.name} on Decibel`,
    description,
    openGraph: {
      title: `${performer.name} on Decibel`,
      description,
      images: performer.photo_url ? [performer.photo_url] : [],
      url: `${SITE_URL}/artist/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${performer.name} on Decibel`,
      description,
    },
  };
}

// Sanitize a string for use in JSON-LD (prevent script injection)
function sanitizeForJsonLd(str: string): string {
  return str.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export default async function ArtistPage({ params }: { params: Params }) {
  const { slug } = await params;
  const performer = await getPerformer(slug);
  if (!performer) notFound();

  const [gradFrom, gradTo] = getGradient(performer.name);
  const [upcomingEvents, fanCount, showCount, founder] = await Promise.all([
    getUpcomingEvents(performer.id),
    getFanCount(performer.id),
    getShowCount(performer.id),
    getFounder(performer.id),
  ]);

  const listenLinks = [
    performer.soundcloud_url && {
      href: performer.soundcloud_url,
      icon: Headphones,
      label: "Listen on SoundCloud",
    },
    performer.mixcloud_url && {
      href: performer.mixcloud_url,
      icon: Music,
      label: "Listen on Mixcloud",
    },
    performer.ra_url && {
      href: performer.ra_url,
      icon: Users,
      label: "View on Resident Advisor",
    },
    performer.instagram_handle && {
      href: `https://instagram.com/${cleanInstagramHandle(performer.instagram_handle)}`,
      icon: Instagram,
      label: `@${cleanInstagramHandle(performer.instagram_handle)}`,
    },
  ].filter(Boolean) as Array<{
    href: string;
    icon: typeof Headphones;
    label: string;
  }>;

  // Build JSON-LD with sanitized values
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: sanitizeForJsonLd(performer.name),
    genre: (performer.genres ?? []).map(sanitizeForJsonLd),
    ...(performer.photo_url && { image: performer.photo_url }),
    ...(performer.city && {
      location: {
        "@type": "Place",
        name: sanitizeForJsonLd(performer.city),
      },
    }),
    url: `${SITE_URL}/artist/${performer.slug}`,
    ...(upcomingEvents.length > 0 && {
      event: upcomingEvents.map((e) => ({
        "@type": "MusicEvent",
        startDate: e.event_date,
        ...(e.venue && {
          location: {
            "@type": "Place",
            name: sanitizeForJsonLd(e.venue.name),
          },
        }),
      })),
    }),
  };

  return (
    <main className="min-h-dvh bg-bg">
      {/* ───── Hero ───── */}
      <div className="relative overflow-hidden">
        {performer.photo_url ? (
          <>
            <Image
              src={performer.photo_url}
              alt=""
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/70 to-bg" />
          </>
        ) : (
          <>
            <div
              className={`absolute inset-0 bg-gradient-to-br ${gradFrom}/30 ${gradTo}/10`}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/60 to-bg" />
          </>
        )}

        <div className="relative mx-auto max-w-2xl px-6 pb-8 pt-16 text-center sm:pb-12 sm:pt-24">
          {/* Back to home */}
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1 text-xs text-gray transition-colors hover:text-[var(--text)]"
          >
            <span className="bg-gradient-to-r from-pink via-purple to-blue bg-clip-text text-transparent font-bold">
              DECIBEL
            </span>
          </Link>

          {/* Avatar */}
          <div className="mx-auto mb-4 h-32 w-32 sm:h-40 sm:w-40">
            {performer.photo_url ? (
              <PerformerImage
                src={performer.photo_url}
                alt={performer.name}
                className="h-full w-full rounded-full object-cover shadow-2xl ring-2 ring-white/10"
                fallbackClassName={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${gradFrom}/30 ${gradTo}/30 text-4xl font-bold text-[var(--text-muted)] shadow-2xl ring-2 ring-white/10`}
              />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${gradFrom}/30 ${gradTo}/30 text-4xl font-bold text-[var(--text-muted)] shadow-2xl ring-2 ring-white/10`}
              >
                {performer.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
          </div>

          {/* Name */}
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {performer.name}
          </h1>

          {/* Genre tags */}
          {performer.genres && performer.genres.length > 0 && (
            <div className="mb-4 flex flex-wrap justify-center gap-2">
              {performer.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ───── Stats Row ───── */}
      <div className="mx-auto max-w-2xl px-6 pb-6">
        <div className="flex items-center justify-center gap-8 text-center">
          <div>
            <p className="text-2xl font-bold text-pink">{fanCount}</p>
            <p className="text-xs text-gray">fans</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-pink">{showCount}</p>
            <p className="text-xs text-gray">shows</p>
          </div>
          {performer.genres && (
            <div>
              <p className="text-2xl font-bold text-pink">
                {performer.genres.length}
              </p>
              <p className="text-xs text-gray">genres</p>
            </div>
          )}
        </div>
      </div>

      {/* ───── Founder Badge / FOMO Hook ───── */}
      <div className="mx-auto max-w-2xl px-6 pb-8">
        {founder ? (
          <div className="rounded-2xl border border-yellow/20 bg-yellow/5 p-6 text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-yellow" />
              <span className="text-sm font-semibold text-yellow">
                Founded by {founder.name}
              </span>
              {founder.avatar_url && (
                <Image
                  src={founder.avatar_url}
                  alt={founder.name}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-yellow/30"
                />
              )}
            </div>
            {fanCount > 0 && (
              <p className="mb-4 text-sm text-[var(--text-muted)]">
                {fanCount} fan{fanCount !== 1 ? "s" : ""} tracking this artist
              </p>
            )}
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-pink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink/90"
            >
              Track {performer.name} on Decibel →
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-yellow/30 bg-gradient-to-br from-yellow/10 via-yellow/5 to-transparent p-6 text-center sm:p-8">
            <div className="mb-2 text-3xl">⭐</div>
            <h3 className="mb-2 text-lg font-bold text-yellow sm:text-xl">
              This artist hasn&apos;t been claimed yet
            </h3>
            <p className="mx-auto mb-5 max-w-md text-sm text-[var(--text-muted)]">
              Be the first to add {performer.name} to Decibel and earn a
              one-of-one Founder badge. Once it&apos;s taken, it&apos;s gone
              forever.
            </p>
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-yellow px-6 py-3 text-sm font-bold text-[#0B0B0F] transition-colors hover:bg-yellow/90"
            >
              Claim Founder Badge →
            </Link>
          </div>
        )}
      </div>

      {/* ───── Upcoming Shows ───── */}
      {upcomingEvents.length > 0 && (
        <div className="mx-auto max-w-2xl px-6 pb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
            Upcoming Shows
          </h2>
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-bg-card px-5 py-4"
              >
                <div className="text-sm font-semibold text-pink">
                  {formatEventDate(event.event_date)}
                </div>
                {event.venue && (
                  <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                    <MapPin className="h-3.5 w-3.5 text-gray" />
                    {event.venue.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───── Listen Links ───── */}
      {listenLinks.length > 0 && (
        <div className="mx-auto max-w-2xl px-6 pb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
            Links
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {listenLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-bg-card px-5 py-4 text-sm font-medium text-[var(--text-muted)] transition-all hover:border-pink/20 hover:text-[var(--text)]"
              >
                <link.icon className="h-4 w-4 text-pink" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ───── Download CTA (repeated) ───── */}
      <div className="mx-auto max-w-2xl px-6 pb-12">
        <AppStoreCTA
          title={`Track ${performer.name} on Decibel`}
          subtitle="Show up to shows. Earn your stamps. Climb the ranks."
          variant="pink"
        />
      </div>

      <Footer />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
