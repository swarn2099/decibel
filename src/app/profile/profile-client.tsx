"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, LogOut, Settings, User } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { TIER_COLORS, TIER_LABELS } from "@/lib/tiers";

type Fan = {
  id: string;
  email: string;
  name: string | null;
};

type Collection = {
  scan_count: number;
  current_tier: string;
  last_scan_date: string;
  performers: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
    genres: string[];
    city: string;
  };
};

type ScanHistoryRow = {
  id: string;
  event_date: string;
  capture_method: string;
  created_at: string;
  performers: { name: string; slug: string };
  venues: { name: string } | null;
};

export function ProfileClient({
  fan,
  userEmail,
  collections,
  scanHistory,
}: {
  fan: Fan | null;
  userEmail: string;
  collections: Collection[];
  scanHistory: ScanHistoryRow[];
}) {
  const router = useRouter();

  async function handleLogout() {
    await createSupabaseBrowser().auth.signOut();
    router.push("/");
  }

  const displayName = fan?.name || userEmail;

  return (
    <div className="min-h-dvh bg-bg">
      {/* Header */}
      <header className="border-b border-light-gray/10 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple text-sm font-bold">
              {(fan?.name || userEmail)[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-bold">{displayName}</h1>
              <p className="text-xs text-gray">
                {collections.length} performer{collections.length !== 1 ? "s" : ""} collected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-lg border border-light-gray/20 px-3 py-2 text-xs text-gray transition-colors hover:border-pink/30 hover:text-pink"
            >
              <Settings size={14} />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-light-gray/20 px-3 py-2 text-xs text-gray transition-colors hover:border-pink/30 hover:text-pink"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Collection Grid */}
        {collections.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-light-gray/10 bg-bg-card p-12 text-center">
            <div className="rounded-full bg-pink/10 p-4">
              <User size={24} className="text-pink" />
            </div>
            <h2 className="text-lg font-semibold">No collections yet</h2>
            <p className="max-w-sm text-sm text-gray">
              You haven&apos;t collected any performers yet. Scan a QR code at your
              next show to get started.
            </p>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-sm font-semibold text-gray">
              Your Collection
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {collections.map((c) => {
                const tier = TIER_COLORS[c.current_tier] || TIER_COLORS.network;
                const initials = c.performers.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <Link
                    key={c.performers.id}
                    href={`/artist/${c.performers.slug}`}
                    className="group rounded-xl border border-light-gray/10 bg-bg-card p-4 transition-colors hover:border-pink/30"
                  >
                    {/* Photo */}
                    <div className="mb-3 flex justify-center">
                      {c.performers.photo_url ? (
                        <img
                          src={c.performers.photo_url}
                          alt={c.performers.name}
                          className="h-20 w-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple to-blue text-lg font-bold">
                          {initials}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <p className="truncate text-center text-sm font-semibold group-hover:text-pink">
                      {c.performers.name}
                    </p>
                    <p className="truncate text-center text-xs text-gray">
                      {c.performers.city}
                    </p>

                    {/* Tier + scans */}
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tier.text} ${tier.bg}`}
                      >
                        {TIER_LABELS[c.current_tier] || c.current_tier}
                      </span>
                      <span className="text-[10px] text-light-gray">
                        {c.scan_count} scan{c.scan_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray">
              <Clock size={14} />
              Scan History
            </h2>
            <div className="rounded-xl border border-light-gray/10 bg-bg-card">
              {scanHistory.map((scan, i) => (
                <div
                  key={scan.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < scanHistory.length - 1
                      ? "border-b border-light-gray/10"
                      : ""
                  }`}
                >
                  <div>
                    <Link
                      href={`/artist/${scan.performers.slug}`}
                      className="text-sm font-medium hover:text-pink"
                    >
                      {scan.performers.name}
                    </Link>
                    {scan.venues?.name && (
                      <p className="text-xs text-light-gray">
                        {scan.venues.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-light-gray/10 px-2 py-0.5 text-[10px] text-light-gray">
                      {scan.capture_method}
                    </span>
                    <span className="text-xs text-gray">
                      {new Date(scan.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
