import { createSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import { AppStoreBadge, AppStoreCTA } from "@/components/app-store-badge";
import { Footer } from "@/components/footer";
import { APP_STORE_URL } from "@/lib/config";
import type { Metadata } from "next";

export const revalidate = 3600; // ISR: 1 hour

export const metadata: Metadata = {
  title: "Decibel — Your Live Music Passport",
  description:
    "Track shows, collect artists, compete with friends. The more you show up, the more you get in.",
  openGraph: {
    title: "Decibel — Your Live Music Passport",
    description:
      "Track shows, collect artists, compete with friends.",
    url: "https://decible.live",
    type: "website",
  },
};

async function getStats() {
  const supabase = await createSupabaseServer();
  const today = new Date().toISOString().split("T")[0];

  const [performers, venues, events] = await Promise.all([
    supabase
      .from("performers")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("venues")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("event_date", today),
  ]);

  return {
    artists: performers.count ?? 0,
    venues: venues.count ?? 0,
    eventsThisWeek: events.count ?? 0,
  };
}

export default async function Home() {
  const stats = await getStats();

  return (
    <main className="min-h-dvh bg-bg">
      {/* ───── Section 1: Hero ───── */}
      <section className="flex flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-20">
        <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
          <span className="text-pink">DECIBEL</span>
        </h1>
        <p className="mb-2 text-lg font-normal text-white sm:text-xl">
          Your Live Music Passport
        </p>
        <p className="mx-auto mb-8 max-w-md text-base text-[rgba(255,255,255,0.6)]">
          Track every show. Collect every artist. Compete with your friends.
        </p>
        <AppStoreBadge label="Available on iOS" />
      </section>

      {/* ───── Section 2: Features ───── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 sm:pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              emoji: "🎵",
              title: "Discover",
              desc: "Find artists before anyone else. Claim your Founder badge.",
            },
            {
              emoji: "📍",
              title: "Collect",
              desc: "Show up to a show. Verify your attendance. Earn your stamp.",
            },
            {
              emoji: "🏆",
              title: "Compete",
              desc: "See who's discovered the most. Climb the leaderboard.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-bg-card p-6"
            >
              <div className="mb-3 text-2xl">{feature.emoji}</div>
              <h3 className="mb-1 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-[rgba(255,255,255,0.6)]">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Section 3: Social Proof / Stats ───── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 sm:pb-20">
        <div className="flex items-center justify-center gap-8 text-center sm:gap-12">
          <div>
            <p className="text-3xl font-bold text-pink sm:text-4xl">
              {stats.artists.toLocaleString()}
            </p>
            <p className="text-xs text-[rgba(255,255,255,0.6)] sm:text-sm">
              artists
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-pink sm:text-4xl">
              {stats.venues.toLocaleString()}
            </p>
            <p className="text-xs text-[rgba(255,255,255,0.6)] sm:text-sm">
              venues
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-pink sm:text-4xl">
              {stats.eventsThisWeek.toLocaleString()}
            </p>
            <p className="text-xs text-[rgba(255,255,255,0.6)] sm:text-sm">
              events this week
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-pink sm:text-4xl">
              Chicago
            </p>
            <p className="text-xs text-[rgba(255,255,255,0.6)] sm:text-sm">
              &nbsp;
            </p>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-[rgba(255,255,255,0.6)]">
          Your scene. Your passport.
        </p>
      </section>

      {/* ───── Section 4: Founder FOMO ───── */}
      <section className="mx-auto max-w-2xl px-6 pb-16 sm:pb-20">
        <div className="rounded-2xl border border-yellow/20 bg-gradient-to-br from-yellow/5 via-transparent to-pink/5 p-8 text-center sm:p-10">
          <h2 className="mb-3 text-xl font-bold text-white sm:text-2xl">
            {stats.artists.toLocaleString()}+ artists. Most don&apos;t have a Founder yet.
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-[rgba(255,255,255,0.6)]">
            Be the first to claim your favorite DJ. One-of-one. Forever.
          </p>
          <AppStoreBadge />
        </div>
      </section>

      <Footer />
    </main>
  );
}
