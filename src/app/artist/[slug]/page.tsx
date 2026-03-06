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
  Calendar,
  Clock,
  Play,
} from "lucide-react";

type Params = Promise<{ slug: string }>;

interface Performer {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  soundcloud_url: string | null;
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
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(profileUrl)}&color=%23FF4D6A&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`;
}

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
  const upcomingEvents = await getUpcomingEvents(performer.id);
  const socialLinks = [
    performer.soundcloud_url && {
      href: performer.soundcloud_url,
      icon: Headphones,
      label: "SoundCloud",
      color: "text-pink",
      hoverBorder: "hover:border-pink/30",
    },
    performer.instagram_handle && {
      href: `https://instagram.com/${performer.instagram_handle}`,
      icon: Instagram,
      label: `@${performer.instagram_handle}`,
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
            <img
              src={performer.photo_url}
              alt={performer.name}
              className="h-40 w-40 shrink-0 rounded-full object-cover shadow-2xl ring-2 ring-white/10 sm:h-52 sm:w-52"
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
      <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-6">
        <Link
          href={`/collect/${performer.slug}`}
          className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${gradFrom} ${gradTo} px-7 py-3 text-sm font-bold text-[var(--text)] shadow-lg transition-all hover:scale-105 hover:shadow-xl`}
        >
          <Play className="h-4 w-4 fill-current" />
          Collect
        </Link>

        {/* Social link pills */}
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden items-center gap-2 rounded-full border border-light-gray/20 px-4 py-2.5 text-xs font-medium transition-all hover:bg-bg-card sm:flex ${link.hoverBorder}`}
            title={link.label}
          >
            <link.icon className={`h-4 w-4 ${link.color}`} />
            <span className="text-[var(--text-muted)]">{link.label}</span>
          </a>
        ))}

        {/* Mobile social icons */}
        <div className="flex items-center gap-2 sm:hidden">
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

        {/* No upcoming shows placeholder */}
        {upcomingEvents.length === 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
              Upcoming Shows
            </h2>
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-light-gray/20 py-10 text-center">
              <Calendar className="h-8 w-8 text-light-gray" />
              <p className="text-sm text-gray">No upcoming shows listed yet</p>
              <p className="text-xs text-light-gray">
                Collect {performer.name} to get notified when shows are announced
              </p>
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
