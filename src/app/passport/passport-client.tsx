"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  QrCode,
  Smartphone,
  MapPin,
  Globe,
  Music,
  Flame,
  Building2,
  Users,
  Compass,
  Disc3,
  Star,
  Ticket,
  Share2,
  Download,
  Link2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { TIER_COLORS, TIER_LABELS } from "@/lib/tiers";
import type {
  PassportFan,
  PassportTimelineEntry,
  PassportStats,
} from "@/lib/types/passport";

interface PassportClientProps {
  fan: PassportFan;
  fanSlug: string;
  timeline: PassportTimelineEntry[];
  isPublic?: boolean;
}

const CAPTURE_ICONS = {
  qr: QrCode,
  nfc: Smartphone,
  location: MapPin,
  online: Globe,
} as const;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function groupByMonth(
  entries: PassportTimelineEntry[]
): Map<string, PassportTimelineEntry[]> {
  const groups = new Map<string, PassportTimelineEntry[]>();
  for (const entry of entries) {
    const key = getMonthKey(entry.created_at);
    const group = groups.get(key) || [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
}

function PerformerAvatar({
  performer,
  verified,
}: {
  performer: PassportTimelineEntry["performer"];
  verified: boolean;
}) {
  const initials = performer.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (performer.photo_url) {
    return (
      <div className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full ${!verified ? "opacity-70" : ""}`}>
        <Image
          src={performer.photo_url}
          alt={performer.name}
          fill
          className="object-cover"
          sizes="56px"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple text-lg font-bold text-white ${
        !verified ? "opacity-70" : ""
      }`}
    >
      {initials}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  span2,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  span2?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-light-gray/10 bg-bg-card p-4 ${
        span2 ? "col-span-2" : ""
      }`}
    >
      <div className="mb-1 flex items-center gap-2 text-gray">
        <Icon size={14} />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="bg-gradient-to-r from-pink via-purple to-blue bg-clip-text text-3xl font-bold text-transparent">
        {value}
      </div>
    </div>
  );
}

function TimelineEntry({ entry }: { entry: PassportTimelineEntry }) {
  const CaptureIcon = CAPTURE_ICONS[entry.capture_method] || Globe;
  const tierColor = entry.current_tier
    ? TIER_COLORS[entry.current_tier]
    : null;
  const tierLabel = entry.current_tier
    ? TIER_LABELS[entry.current_tier]
    : null;

  if (entry.verified) {
    // Verified entry: full color, solid badge, glow
    const glowColor =
      entry.current_tier === "inner_circle"
        ? "shadow-[0_0_15px_rgba(0,212,170,0.15)]"
        : entry.current_tier === "secret"
        ? "shadow-[0_0_15px_rgba(77,154,255,0.15)]"
        : entry.current_tier === "early_access"
        ? "shadow-[0_0_15px_rgba(155,109,255,0.15)]"
        : "shadow-[0_0_15px_rgba(255,77,106,0.15)]";

    const borderAccent =
      entry.current_tier === "inner_circle"
        ? "border-l-teal"
        : entry.current_tier === "secret"
        ? "border-l-blue"
        : entry.current_tier === "early_access"
        ? "border-l-purple"
        : "border-l-pink";

    return (
      <div
        className={`rounded-xl border border-light-gray/10 border-l-2 ${borderAccent} bg-bg-card p-4 ${glowColor} transition-all`}
      >
        <div className="flex items-start gap-3">
          <PerformerAvatar performer={entry.performer} verified />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/artist/${entry.performer.slug}`}
                className="truncate font-semibold text-[var(--text)] hover:text-pink transition-colors"
              >
                {entry.performer.name}
              </Link>
              {tierColor && tierLabel && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tierColor.bg} ${tierColor.text}`}
                >
                  {tierLabel}
                </span>
              )}
            </div>
            {entry.venue && (
              <p className="text-sm text-gray">{entry.venue.name}</p>
            )}
            <div className="mt-1 flex items-center gap-3 text-xs text-light-gray">
              <span>{entry.event_date ? formatDate(entry.event_date) : formatDate(entry.created_at)}</span>
              <span className="flex items-center gap-1">
                <CaptureIcon size={12} />
                {entry.capture_method.toUpperCase()}
              </span>
              {entry.scan_count !== null && (
                <span>{entry.scan_count} scan{entry.scan_count !== 1 ? "s" : ""}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Discovered entry: muted, outline badge
  return (
    <div className="rounded-xl border border-light-gray/10 bg-bg-card/50 p-4">
      <div className="flex items-start gap-3">
        <PerformerAvatar performer={entry.performer} verified={false} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/artist/${entry.performer.slug}`}
              className="truncate font-semibold text-[var(--text)] opacity-80 hover:text-pink transition-colors"
            >
              {entry.performer.name}
            </Link>
            <span className="shrink-0 rounded-full border border-light-gray/30 px-2 py-0.5 text-xs text-gray">
              Discovered
            </span>
          </div>
          {entry.venue && (
            <p className="text-sm text-gray/70">{entry.venue.name}</p>
          )}
          <div className="mt-1 flex items-center gap-3 text-xs text-light-gray/70">
            <span>{formatDate(entry.created_at)}</span>
            <span className="flex items-center gap-1">
              <CaptureIcon size={12} />
              {entry.capture_method.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareMenu({
  fanSlug,
  fanName,
  stats,
  timeline,
  onClose,
}: {
  fanSlug: string;
  fanName: string;
  stats: PassportStats | null;
  timeline: PassportTimelineEntry[];
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const uniqueArtists = new Set(timeline.map((t) => t.performer.id)).size;
  const uniqueVenues = new Set(
    timeline.filter((t) => t.venue).map((t) => t.venue!.name)
  ).size;

  // Get top artists by collection count
  const artistCounts = new Map<string, { name: string; count: number }>();
  for (const t of timeline) {
    const existing = artistCounts.get(t.performer.id);
    if (existing) {
      existing.count++;
    } else {
      artistCounts.set(t.performer.id, { name: t.performer.name, count: 1 });
    }
  }
  const topArtists = Array.from(artistCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((a) => a.name);

  async function handleDownloadStoryCard() {
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        name: fanName,
        artists: String(uniqueArtists),
        shows: String(timeline.length),
        venues: String(uniqueVenues),
        cities: String(stats?.uniqueCities || 0),
        streak: String(stats?.currentStreak || 0),
        genre: stats?.favoriteGenre || "",
        slug: fanSlug,
      });
      if (topArtists.length > 0) {
        params.set("topArtists", topArtists.join(","));
      }

      const response = await fetch(`/api/passport/share-card?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to generate image");

      const blob = await response.blob();
      const file = new File([blob], "decibel-passport.png", { type: "image/png" });

      // Try Web Share API on mobile
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${fanName}'s DECIBEL Passport`,
        });
        toast.success("Shared successfully!");
      } else {
        // Desktop fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "decibel-passport.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Story card downloaded!");
      }
    } catch {
      toast.error("Failed to generate story card");
    } finally {
      setDownloading(false);
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/passport/${fanSlug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Passport link copied!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  }

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-light-gray/10 bg-bg-card p-2 shadow-xl"
    >
      <button
        onClick={handleDownloadStoryCard}
        disabled={downloading}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--text)] hover:bg-light-gray/10 transition-colors disabled:opacity-50"
      >
        <Download size={18} className="text-pink" />
        <div>
          <div className="font-medium">{downloading ? "Generating..." : "Download Story Card"}</div>
          <div className="text-xs text-gray">1080x1920 PNG for Instagram</div>
        </div>
      </button>
      <button
        onClick={handleCopyLink}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--text)] hover:bg-light-gray/10 transition-colors"
      >
        <Link2 size={18} className="text-purple" />
        <div>
          <div className="font-medium">Copy Passport Link</div>
          <div className="text-xs text-gray">Share your public passport URL</div>
        </div>
      </button>
    </div>
  );
}

export function PassportClient({ fan, fanSlug, timeline, isPublic = false }: PassportClientProps) {
  const [stats, setStats] = useState<PassportStats | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    // Only fetch stats on authenticated view (stats endpoint requires auth)
    if (!isPublic) {
      fetch("/api/passport/stats")
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {});
    }
  }, [isPublic]);

  const verifiedCount = timeline.filter((t) => t.verified).length;
  const uniqueArtists = new Set(timeline.map((t) => t.performer.id)).size;
  const uniqueVenues = new Set(
    timeline.filter((t) => t.venue).map((t) => t.venue!.name)
  ).size;

  const memberSince = new Date(fan.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const initials = fan.name
    ? fan.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : fan.email[0].toUpperCase();

  const grouped = groupByMonth(timeline);

  return (
    <div className="min-h-screen bg-bg pb-24 pt-20">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="relative inline-block">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple text-2xl font-bold text-white">
              {initials}
            </div>
            {/* Share button (own passport only) */}
            {!isPublic && (
              <div className="absolute -right-12 top-0 relative inline-block">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="absolute -right-14 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-light-gray/20 bg-bg-card text-gray hover:text-pink hover:border-pink/30 transition-colors"
                  aria-label="Share passport"
                >
                  {showShareMenu ? <X size={16} /> : <Share2 size={16} />}
                </button>
                {showShareMenu && (
                  <ShareMenu
                    fanSlug={fanSlug}
                    fanName={fan.name || "Fan"}
                    stats={stats}
                    timeline={timeline}
                    onClose={() => setShowShareMenu(false)}
                  />
                )}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {fan.name || "Anonymous Fan"}
          </h1>
          <p className="mt-1 text-sm text-gray">
            {fan.city && <span>{fan.city} &middot; </span>}
            Member since {memberSince}
          </p>

          {/* Summary stats row */}
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <span>
              <span className="font-bold text-pink">{uniqueArtists}</span>{" "}
              <span className="text-gray">Artists</span>
            </span>
            <span className="text-light-gray/30">|</span>
            <span>
              <span className="font-bold text-purple">{verifiedCount}</span>{" "}
              <span className="text-gray">Verified</span>
            </span>
            <span className="text-light-gray/30">|</span>
            <span>
              <span className="font-bold text-blue">{timeline.length}</span>{" "}
              <span className="text-gray">Shows</span>
            </span>
            <span className="text-light-gray/30">|</span>
            <span>
              <span className="font-bold text-teal">{uniqueVenues}</span>{" "}
              <span className="text-gray">Venues</span>
            </span>
          </div>
        </div>

        {/* Sound Stats (hidden on public view since stats endpoint requires auth) */}
        {!isPublic && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-bold text-[var(--text)]">
              Your Sound Stats
            </h2>
            {stats ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatCard
                  label="Dancefloors"
                  value={stats.totalShows}
                  icon={Disc3}
                />
                <StatCard
                  label="Cities"
                  value={stats.uniqueCities || "--"}
                  icon={Compass}
                />
                <StatCard
                  label="Artists Collected"
                  value={stats.totalArtists}
                  icon={Users}
                />
                <StatCard
                  label="Artists Discovered"
                  value={stats.totalDiscovered}
                  icon={Globe}
                />
                <StatCard
                  label="Venues"
                  value={stats.uniqueVenues}
                  icon={Building2}
                />
                <StatCard
                  label="Favorite Genre"
                  value={stats.favoriteGenre || "--"}
                  icon={Music}
                />
                <StatCard
                  label="Current Streak"
                  value={stats.currentStreak > 0 ? `${stats.currentStreak}w` : "--"}
                  icon={Flame}
                />
                {stats.mostCollectedArtist && (
                  <StatCard
                    label="Most Collected"
                    value={`${stats.mostCollectedArtist.name} (${stats.mostCollectedArtist.count})`}
                    icon={Star}
                    span2
                  />
                )}
                {stats.mostVisitedVenue && (
                  <StatCard
                    label="Most Visited Venue"
                    value={`${stats.mostVisitedVenue.name} (${stats.mostVisitedVenue.count})`}
                    icon={Ticket}
                    span2
                  />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl border border-light-gray/10 bg-bg-card"
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Collection Timeline */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-[var(--text)]">
            Collection Timeline
          </h2>

          {timeline.length === 0 ? (
            <div className="rounded-xl border border-light-gray/10 bg-bg-card p-8 text-center">
              <QrCode size={48} className="mx-auto mb-4 text-light-gray/40" />
              <p className="text-gray">
                {isPublic ? "This passport is empty." : "Your passport is empty."}
              </p>
              <p className="mt-1 text-sm text-light-gray">
                {isPublic
                  ? "This fan hasn't collected any artists yet."
                  : "Scan a QR code at your next show to start collecting."}
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-pink/30 pl-6">
              {Array.from(grouped.entries()).map(([monthKey, entries]) => (
                <div key={monthKey} className="mb-6">
                  <div className="sticky top-16 z-10 -ml-6 mb-3 flex items-center">
                    <div className="h-3 w-3 rounded-full bg-pink" />
                    <span className="ml-3 text-sm font-semibold text-gray">
                      {formatMonthYear(entries[0].created_at)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {entries.map((entry) => (
                      <TimelineEntry key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Public CTA */}
        {isPublic && (
          <div className="mt-12 rounded-xl border border-pink/20 bg-gradient-to-br from-pink/5 to-purple/5 p-6 text-center">
            <h3 className="mb-2 text-lg font-bold text-[var(--text)]">
              Get your own passport
            </h3>
            <p className="mb-4 text-sm text-gray">
              Scan a QR code at your next show to start building your live music record.
            </p>
            <p className="text-xs text-light-gray">
              The more you show up, the more you get in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
