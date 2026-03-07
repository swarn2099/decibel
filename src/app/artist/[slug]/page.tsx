import { createSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  MapPin,
  ExternalLink,
  Instagram,
  Headphones,
  Music,
  Users,
  Clock,
  Play,
  History,
} from "lucide-react";
import { PerformerImage } from "@/components/performer-image";
import { TIER_COLORS, TIER_LABELS } from "@/lib/tiers";

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
  start_time: string | null;
  end_time: string | null;
  external_url: string | null;
  venue: {
    name: string;
    slug: string;
    address: string | null;
  } | null;
}

interface SimilarArtist {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[] | null;
  city: string | null;
}

interface FanStats {
  total_fans: number;
  collectors: number;
  discoverers: number;
  tier_breakdown: Record<string, number>;
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
  // If it's a full URL, extract the username from the path
  if (handle.startsWith("http") || handle.includes("instagram.com")) {
    try {
      const url = new URL(handle.startsWith("http") ? handle : `https://${handle}`);
      const path = url.pathname.replace(/^\//, "").replace(/\/$/, "");
      return path.replace(/^@/, "");
    } catch {
      // If URL parsing fails, just strip common prefixes
      return handle
        .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
        .replace(/^@/, "")
        .replace(/\/$/, "");
    }
  }
  return handle.replace(/^@/, "");
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function formatEventDate(dateStr: string): { day: string; month: string; weekday: string } {
  const date = new Date(dateStr + "T00:00:00");
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

function formatTime(timeStr: string): string {
  const date = new Date(timeStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getSoundCloudEmbedUrl(profileUrl: string): string {
  // Normalize: strip www. prefix — the widget doesn't resolve www.soundcloud.com
  const normalizedUrl = profileUrl.replace("www.soundcloud.com", "soundcloud.com");
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(normalizedUrl)}&color=%23FF4D6A&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`;
}

function getSpotifyArtistId(spotifyUrl: string): string | null {
  const match = spotifyUrl.match(/artist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// Tailwind hex colors for tier bar segments (can't use dynamic class names)
const TIER_BAR_COLORS: Record<string, string> = {
  network: "bg-pink",
  early_access: "bg-purple",
  secret: "bg-blue",
  inner_circle: "bg-teal",
};

async function getPerformer(slug: string): Promise<Performer | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("performers")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data as Performer;
}

async function getUpcomingEvents(performerId: string): Promise<Event[]> {
  const supabase = await createSupabaseServer();
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("events")
    .select("id, event_date, start_time, end_time, external_url, venue:venues(name, slug, address)")
    .eq("performer_id", performerId)
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(6);

  if (!data) return [];
  // Supabase returns joined single relations as arrays — unwrap
  return data.map((e) => ({
    ...e,
    venue: Array.isArray(e.venue) ? e.venue[0] ?? null : e.venue,
  })) as Event[];
}

async function getPastEvents(performerId: string): Promise<Event[]> {
  const supabase = await createSupabaseServer();
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("events")
    .select("id, event_date, start_time, end_time, external_url, venue:venues(name, slug, address)")
    .eq("performer_id", performerId)
    .lt("event_date", today)
    .order("event_date", { ascending: false })
    .limit(12);

  if (!data) return [];
  return data.map((e) => ({
    ...e,
    venue: Array.isArray(e.venue) ? e.venue[0] ?? null : e.venue,
  })) as Event[];
}

async function getFanCount(performerId: string): Promise<number> {
  const supabase = await createSupabaseServer();
  const { count, error } = await supabase
    .from("collections")
    .select("fan_id", { count: "exact", head: true })
    .eq("performer_id", performerId);

  if (error || count === null) return 0;
  return count;
}

async function getFanStats(performerId: string): Promise<FanStats> {
  const supabase = await createSupabaseServer();

  const [collectorsRes, discoverersRes, tiersRes] = await Promise.all([
    supabase
      .from("collections")
      .select("fan_id", { count: "exact", head: true })
      .eq("performer_id", performerId)
      .eq("verified", true),
    supabase
      .from("collections")
      .select("fan_id", { count: "exact", head: true })
      .eq("performer_id", performerId)
      .eq("verified", false),
    supabase
      .from("fan_tiers")
      .select("current_tier")
      .eq("performer_id", performerId),
  ]);

  const collectors = collectorsRes.count ?? 0;
  const discoverers = discoverersRes.count ?? 0;

  const tier_breakdown: Record<string, number> = {};
  if (tiersRes.data) {
    for (const row of tiersRes.data) {
      const tier = row.current_tier as string;
      tier_breakdown[tier] = (tier_breakdown[tier] || 0) + 1;
    }
  }

  return {
    total_fans: collectors + discoverers,
    collectors,
    discoverers,
    tier_breakdown,
  };
}

async function getSimilarArtists(
  performerId: string,
  genres: string[] | null
): Promise<SimilarArtist[]> {
  if (!genres || genres.length === 0) return [];

  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("performers")
    .select("id, name, slug, photo_url, genres, city")
    .overlaps("genres", genres)
    .neq("id", performerId)
    .order("follower_count", { ascending: false, nullsFirst: false })
    .limit(8);

  return (data ?? []) as SimilarArtist[];
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const performer = await getPerformer(slug);
  if (!performer) return { title: "DECIBEL" };

  const description =
    performer.bio ||
    `${performer.name} on Decibel — the more you show up, the more you get in.`;

  return {
    title: `${performer.name} | DECIBEL`,
    description,
    openGraph: {
      title: `${performer.name} | DECIBEL`,
      description,
      images: performer.photo_url ? [performer.photo_url] : [],
    },
  };
}

export default async function ArtistPage({ params }: { params: Params }) {
  const { slug } = await params;
  const performer = await getPerformer(slug);

  if (!performer) notFound();

  const [gradFrom, gradTo] = getGradient(performer.name);
  const [upcomingEvents, pastEvents, fanCount, fanStats, similarArtists] =
    await Promise.all([
      getUpcomingEvents(performer.id),
      getPastEvents(performer.id),
      getFanCount(performer.id),
      getFanStats(performer.id),
      getSimilarArtists(performer.id, performer.genres),
    ]);

  const spotifyArtistId = performer.spotify_url
    ? getSpotifyArtistId(performer.spotify_url)
    : null;

  // Count distinct venues from past events
  const pastVenueNames = new Set(
    pastEvents
      .map((e) => e.venue?.name)
      .filter(Boolean)
  );

  const socialLinks = [
    performer.soundcloud_url && {
      href: performer.soundcloud_url,
      icon: Headphones,
      label: "SoundCloud",
      color: "text-pink",
      hoverBorder: "hover:border-pink/30",
    },
    performer.instagram_handle && {
      href: `https://instagram.com/${cleanInstagramHandle(performer.instagram_handle)}`,
      icon: Instagram,
      label: `@${cleanInstagramHandle(performer.instagram_handle)}`,
      color: "text-purple",
      hoverBorder: "hover:border-purple/30",
    },
    performer.mixcloud_url && {
      href: performer.mixcloud_url,
      icon: Music,
      label: "Mixcloud",
      color: "text-blue",
      hoverBorder: "hover:border-blue/30",
    },
    performer.ra_url && {
      href: performer.ra_url,
      icon: Users,
      label: "Resident Advisor",
      color: "text-teal",
      hoverBorder: "hover:border-teal/30",
    },
  ].filter(Boolean) as Array<{
    href: string;
    icon: typeof Headphones;
    label: string;
    color: string;
    hoverBorder: string;
  }>;

  // Total tier count for proportion bar
  const tierTotal = Object.values(fanStats.tier_breakdown).reduce(
    (sum, n) => sum + n,
    0
  );

  return (
    <main className="min-h-dvh bg-bg">
      {/* ───── Spotify-style Hero ───── */}
      <div className="relative overflow-hidden">
        {/* Gradient background glow */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradFrom}/30 ${gradTo}/10 blur-3xl`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/60 to-bg" />

        <div className="relative mx-auto flex max-w-4xl items-end gap-6 px-6 pb-8 pt-24 sm:gap-8 sm:pb-10 sm:pt-32">
          {/* Avatar */}
          {performer.photo_url ? (
            <PerformerImage
              src={performer.photo_url}
              alt={performer.name}
              className="h-40 w-40 shrink-0 rounded-full object-cover shadow-2xl ring-2 ring-white/10 sm:h-52 sm:w-52"
              fallbackClassName={`flex h-40 w-40 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradFrom}/30 ${gradTo}/30 text-5xl font-bold text-[var(--text-muted)] shadow-2xl ring-2 ring-white/10 sm:h-52 sm:w-52 sm:text-6xl`}
            />
          ) : (
            <div
              className={`flex h-40 w-40 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradFrom}/30 ${gradTo}/30 text-5xl font-bold text-[var(--text-muted)] shadow-2xl ring-2 ring-white/10 sm:h-52 sm:w-52 sm:text-6xl`}
            >
              {performer.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}

          {/* Name + meta */}
          <div className="min-w-0 pb-1">
            {performer.genres && performer.genres.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {performer.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full bg-gray/20 px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            <h1 className="mb-2 text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              {performer.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray">
              {performer.follower_count && performer.follower_count > 0 && (
                <span>
                  <span className="font-semibold text-[var(--text)]">
                    {formatFollowers(performer.follower_count)}
                  </span>{" "}
                  followers
                </span>
              )}
              {fanCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-semibold text-[var(--text)]">{fanCount}</span>{" "}
                  fans
                </span>
              )}
              {performer.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {performer.city}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ───── Action Bar ───── */}
      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            href={`/collect/${performer.slug}`}
            className={`flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r ${gradFrom} ${gradTo} px-10 py-4 text-base font-extrabold text-[var(--text)] shadow-[0_0_20px_rgba(255,77,106,0.4)] transition-all hover:scale-105 hover:shadow-xl sm:w-auto`}
          >
            <Play className="h-5 w-5 fill-current" />
            Collect
          </Link>

          {/* Social link pills (desktop) */}
          <div className="hidden items-center gap-3 sm:flex">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 rounded-full border border-light-gray/20 px-4 py-2.5 text-xs font-medium transition-all hover:bg-bg-card ${link.hoverBorder}`}
                title={link.label}
              >
                <link.icon className={`h-4 w-4 ${link.color}`} />
                <span className="text-[var(--text-muted)]">{link.label}</span>
              </a>
            ))}
          </div>

          {/* Mobile social icons */}
          <div className="flex items-center justify-center gap-2 sm:hidden">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center rounded-full border border-light-gray/20 p-2.5 transition-all hover:bg-bg-card ${link.hoverBorder}`}
                title={link.label}
              >
                <link.icon className={`h-4 w-4 ${link.color}`} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ───── Content ───── */}
      <div className="mx-auto max-w-4xl px-6 pb-20">
        {/* SoundCloud Tracks Widget */}
        {performer.soundcloud_url && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
              Tracks
            </h2>
            <div className="overflow-hidden rounded-xl border border-light-gray/15">
              <iframe
                title={`${performer.name} on SoundCloud`}
                width="100%"
                height="166"
                scrolling="no"
                frameBorder="no"
                allow="autoplay"
                src={getSoundCloudEmbedUrl(performer.soundcloud_url)}
                className="block"
              />
            </div>
          </section>
        )}

        {/* Spotify Embed */}
        {spotifyArtistId && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
              On Spotify
            </h2>
            <div className="overflow-hidden rounded-xl">
              <iframe
                title={`${performer.name} on Spotify`}
                src={`https://open.spotify.com/embed/artist/${spotifyArtistId}?utm_source=generator&theme=0`}
                width="100%"
                height="352"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="block rounded-xl"
                style={{ borderRadius: "12px" }}
              />
            </div>
          </section>
        )}

        {/* Upcoming Shows */}
        {upcomingEvents.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
              Upcoming Shows
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {upcomingEvents.map((event) => {
                const { day, month, weekday } = formatEventDate(event.event_date);
                const Wrapper = event.external_url ? "a" : "div";
                const wrapperProps = event.external_url
                  ? {
                      href: event.external_url,
                      target: "_blank" as const,
                      rel: "noopener noreferrer",
                    }
                  : {};
                return (
                  <Wrapper
                    key={event.id}
                    {...wrapperProps}
                    className="group flex items-center gap-4 rounded-xl border border-light-gray/15 bg-bg-card px-5 py-4 transition-all hover:border-pink/20 hover:bg-bg-card/80"
                  >
                    {/* Date block */}
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-gray/10">
                      <span className="text-[10px] font-bold uppercase leading-none text-pink">
                        {month}
                      </span>
                      <span className="text-xl font-bold leading-tight">
                        {day}
                      </span>
                      <span className="text-[10px] text-gray leading-none">
                        {weekday}
                      </span>
                    </div>

                    {/* Event info */}
                    <div className="min-w-0 flex-1">
                      {event.venue && (
                        <p className="truncate text-sm font-semibold">
                          {event.venue.name}
                        </p>
                      )}
                      {event.venue?.address && (
                        <p className="truncate text-xs text-gray">
                          {event.venue.address}
                        </p>
                      )}
                      {event.start_time && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-light-gray">
                          <Clock className="h-3 w-3" />
                          {formatTime(event.start_time)}
                        </p>
                      )}
                    </div>

                    {/* External link indicator */}
                    {event.external_url && (
                      <ExternalLink className="h-4 w-4 shrink-0 text-light-gray transition-colors group-hover:text-[var(--text)]" />
                    )}
                  </Wrapper>
                );
              })}
            </div>
          </section>
        )}

        {/* Past Shows */}
        {pastEvents.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
              <History className="mr-2 inline h-4 w-4" />
              Past Shows
            </h2>
            {pastVenueNames.size > 0 && (
              <p className="mb-3 text-sm text-gray">
                Played at{" "}
                <span className="font-semibold text-[var(--text-muted)]">
                  {pastVenueNames.size}
                </span>{" "}
                venue{pastVenueNames.size !== 1 ? "s" : ""}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {pastEvents.map((event) => {
                const { day, month, weekday } = formatEventDate(event.event_date);
                const Wrapper = event.external_url ? "a" : "div";
                const wrapperProps = event.external_url
                  ? {
                      href: event.external_url,
                      target: "_blank" as const,
                      rel: "noopener noreferrer",
                    }
                  : {};
                return (
                  <Wrapper
                    key={event.id}
                    {...wrapperProps}
                    className="group flex items-center gap-4 rounded-xl border border-light-gray/15 bg-bg-card px-5 py-4 transition-all hover:border-pink/20 hover:bg-bg-card/80"
                  >
                    {/* Date block — muted for past events */}
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-gray/10 opacity-70">
                      <span className="text-[10px] font-bold uppercase leading-none text-pink">
                        {month}
                      </span>
                      <span className="text-xl font-bold leading-tight">
                        {day}
                      </span>
                      <span className="text-[10px] text-gray leading-none">
                        {weekday}
                      </span>
                    </div>

                    {/* Event info */}
                    <div className="min-w-0 flex-1">
                      {event.venue && (
                        <p className="truncate text-sm font-semibold">
                          {event.venue.name}
                        </p>
                      )}
                      {event.venue?.address && (
                        <p className="truncate text-xs text-gray">
                          {event.venue.address}
                        </p>
                      )}
                      {event.start_time && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-light-gray">
                          <Clock className="h-3 w-3" />
                          {formatTime(event.start_time)}
                        </p>
                      )}
                    </div>

                    {/* External link indicator */}
                    {event.external_url && (
                      <ExternalLink className="h-4 w-4 shrink-0 text-light-gray transition-colors group-hover:text-[var(--text)]" />
                    )}
                  </Wrapper>
                );
              })}
            </div>
          </section>
        )}

        {/* About */}
        {performer.bio && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray">
              About
            </h2>
            <div className="rounded-xl border border-light-gray/15 bg-bg-card p-6">
              <p className="leading-relaxed text-[var(--text-muted)]">{performer.bio}</p>
              {performer.city && (
                <p className="mt-4 flex items-center gap-1.5 text-sm text-gray">
                  <MapPin className="h-3.5 w-3.5" />
                  {performer.city}
                </p>
              )}
              {performer.follower_count && performer.follower_count > 0 && (
                <p className="mt-1 text-sm text-gray">
                  <span className="font-semibold text-[var(--text-muted)]">
                    {formatFollowers(performer.follower_count)}
                  </span>{" "}
                  followers on SoundCloud
                </p>
              )}
            </div>
          </section>
        )}

        {/* Community / Fan Stats */}
        {fanStats.total_fans > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
              Community
            </h2>
            <div className="rounded-xl border border-light-gray/15 bg-bg-card p-6">
              {/* Stat numbers row */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{fanStats.total_fans}</p>
                  <p className="text-xs text-gray">Total Fans</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-pink">{fanStats.collectors}</p>
                  <p className="text-xs text-gray">Collectors</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple">{fanStats.discoverers}</p>
                  <p className="text-xs text-gray">Discoverers</p>
                </div>
              </div>

              {/* Tier breakdown bar */}
              {tierTotal > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray">
                    Tier Breakdown
                  </p>
                  {/* Proportion bar */}
                  <div className="flex h-3 overflow-hidden rounded-full">
                    {(["network", "early_access", "secret", "inner_circle"] as const).map(
                      (tier) => {
                        const count = fanStats.tier_breakdown[tier] || 0;
                        if (count === 0) return null;
                        const pct = (count / tierTotal) * 100;
                        return (
                          <div
                            key={tier}
                            className={`${TIER_BAR_COLORS[tier]} transition-all`}
                            style={{ width: `${pct}%` }}
                            title={`${TIER_LABELS[tier]}: ${count}`}
                          />
                        );
                      }
                    )}
                  </div>
                  {/* Legend */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                    {(["network", "early_access", "secret", "inner_circle"] as const).map(
                      (tier) => {
                        const count = fanStats.tier_breakdown[tier] || 0;
                        if (count === 0) return null;
                        return (
                          <span
                            key={tier}
                            className="flex items-center gap-1.5 text-xs text-gray"
                          >
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${TIER_BAR_COLORS[tier]}`}
                            />
                            <span className={TIER_COLORS[tier]?.text}>
                              {TIER_LABELS[tier]}
                            </span>
                            <span className="text-[var(--text-muted)]">{count}</span>
                          </span>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Similar Artists */}
        {similarArtists.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
              Similar Artists
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {similarArtists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artist/${artist.slug}`}
                  className="group flex w-32 shrink-0 flex-col items-center gap-2 rounded-xl border border-light-gray/15 bg-bg-card p-4 transition-all hover:border-pink/20 hover:bg-bg-card/80"
                >
                  {artist.photo_url ? (
                    <PerformerImage
                      src={artist.photo_url}
                      alt={artist.name}
                      className="h-16 w-16 rounded-full object-cover ring-1 ring-white/10"
                      fallbackClassName="flex h-16 w-16 items-center justify-center rounded-full bg-gray/20 text-lg font-bold text-[var(--text-muted)] ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray/20 text-lg font-bold text-[var(--text-muted)] ring-1 ring-white/10">
                      {artist.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                  <p className="w-full truncate text-center text-xs font-semibold">
                    {artist.name}
                  </p>
                  {artist.genres && artist.genres.length > 0 && (
                    <span className="rounded-full bg-gray/15 px-2 py-0.5 text-[10px] text-gray">
                      {artist.genres[0]}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Mobile Links (full cards, visible on small screens) */}
        {socialLinks.length > 0 && (
          <section className="mb-10 sm:hidden">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
              Links
            </h2>
            <div className="grid gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 rounded-xl border border-light-gray/15 bg-bg-card px-5 py-4 transition-all ${link.hoverBorder} hover:bg-bg-card/80`}
                >
                  <link.icon className={`h-5 w-5 ${link.color}`} />
                  <span className="text-sm font-medium">{link.label}</span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-light-gray" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-gray transition-colors hover:text-[var(--text)]"
          >
            &larr; Back to all performers
          </Link>
        </div>
      </div>
    </main>
  );
}
