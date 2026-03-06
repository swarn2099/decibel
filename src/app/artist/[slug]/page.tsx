import { createSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Music,
  Users,
  MapPin,
  ExternalLink,
  Instagram,
  Headphones,
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

  return (
    <main className="min-h-dvh bg-bg">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient background glow */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradFrom}/20 ${gradTo}/10 blur-3xl`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pb-12 pt-20">
          {/* Avatar */}
          {performer.photo_url ? (
            <img
              src={performer.photo_url}
              alt={performer.name}
              className={`mb-6 h-36 w-36 rounded-full object-cover ring-4 ring-${gradFrom.replace("from-", "")}/40 shadow-2xl`}
            />
          ) : (
            <div
              className={`mb-6 flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br ${gradFrom}/30 ${gradTo}/30 text-5xl font-bold text-white/80 shadow-2xl ring-4 ring-white/10`}
            >
              {performer.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}

          {/* Name */}
          <h1 className="mb-2 text-center text-4xl font-bold tracking-tight sm:text-5xl">
            {performer.name}
          </h1>

          {/* City */}
          {performer.city && (
            <div className="mb-4 flex items-center gap-1.5 text-sm text-gray">
              <MapPin className="h-3.5 w-3.5" />
              <span>{performer.city}</span>
            </div>
          )}

          {/* Genres */}
          {performer.genres && performer.genres.length > 0 && (
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {performer.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-light-gray/20 bg-bg-card px-3 py-1 text-xs font-medium text-gray"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="mb-8 flex items-center gap-8">
            {performer.follower_count && performer.follower_count > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">
                  {formatFollowers(performer.follower_count)}
                </span>
                <span className="text-xs text-gray">followers</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <Link
            href={`/collect/${performer.slug}`}
            className={`rounded-full bg-gradient-to-r ${gradFrom} ${gradTo} px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl`}
          >
            Collect {performer.name}
          </Link>
        </div>
      </div>

      {/* Content Section */}
      <div className="mx-auto max-w-3xl px-6 pb-20">
        {/* Bio */}
        {performer.bio && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray">
              About
            </h2>
            <p className="leading-relaxed text-white/80">{performer.bio}</p>
          </section>
        )}

        {/* Links */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray">
            Links
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {performer.soundcloud_url && (
              <a
                href={performer.soundcloud_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-light-gray/15 bg-bg-card px-5 py-4 transition-all hover:border-pink/30 hover:bg-bg-card/80"
              >
                <Headphones className="h-5 w-5 text-pink" />
                <span className="text-sm font-medium">SoundCloud</span>
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-light-gray" />
              </a>
            )}

            {performer.instagram_handle && (
              <a
                href={`https://instagram.com/${performer.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-light-gray/15 bg-bg-card px-5 py-4 transition-all hover:border-purple/30 hover:bg-bg-card/80"
              >
                <Instagram className="h-5 w-5 text-purple" />
                <span className="text-sm font-medium">
                  @{performer.instagram_handle}
                </span>
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-light-gray" />
              </a>
            )}

            {performer.mixcloud_url && (
              <a
                href={performer.mixcloud_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-light-gray/15 bg-bg-card px-5 py-4 transition-all hover:border-blue/30 hover:bg-bg-card/80"
              >
                <Music className="h-5 w-5 text-blue" />
                <span className="text-sm font-medium">Mixcloud</span>
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-light-gray" />
              </a>
            )}

            {performer.ra_url && (
              <a
                href={performer.ra_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-light-gray/15 bg-bg-card px-5 py-4 transition-all hover:border-teal/30 hover:bg-bg-card/80"
              >
                <Users className="h-5 w-5 text-teal" />
                <span className="text-sm font-medium">Resident Advisor</span>
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-light-gray" />
              </a>
            )}
          </div>
        </section>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-gray transition-colors hover:text-white"
          >
            ← Back to all performers
          </Link>
        </div>
      </div>
    </main>
  );
}
