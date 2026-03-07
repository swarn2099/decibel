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
  Plus,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { TIER_COLORS, TIER_LABELS } from "@/lib/tiers";
import type {
  PassportFan,
  PassportTimelineEntry,
  PassportStats,
} from "@/lib/types/passport";
import type { BadgeWithDefinition, BadgeDefinition } from "@/lib/types/badges";
import { BADGE_DEFINITIONS } from "@/lib/badges/definitions";
import { DiscoverModal } from "./discover-modal";
import { SpotifyImport } from "./spotify-import";
import { Recommendations } from "./recommendations";
import { BadgeShowcase } from "./badge-showcase";
import { BadgeUnlockToast } from "./badge-unlock-toast";
import { SocialCounts } from "./social-counts";
import { ShareCardButton, getMilestoneForStat } from "./share-cards";
import { ActivityFeed } from "./activity-feed";
import { ContactSuggestions } from "./contact-suggestions";

interface PassportClientProps {
  fan: PassportFan;
  fanSlug: string;
  timeline: PassportTimelineEntry[];
  isPublic?: boolean;
  badges?: BadgeWithDefinition[];
  viewerFanId?: string;
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

/* ─── Stamp: circular artist photo with tier-colored ring ─── */
function ArtistStamp({ entry }: { entry: PassportTimelineEntry }) {
  const tierRingColor = entry.verified
    ? entry.current_tier === "inner_circle"
      ? "ring-teal shadow-[0_0_12px_rgba(0,212,170,0.4)]"
      : entry.current_tier === "secret"
      ? "ring-blue shadow-[0_0_12px_rgba(77,154,255,0.4)]"
      : entry.current_tier === "early_access"
      ? "ring-purple shadow-[0_0_12px_rgba(155,109,255,0.4)]"
      : "ring-pink shadow-[0_0_10px_rgba(255,77,106,0.3)]"
    : "ring-light-gray/20";

  const tierLabel = entry.current_tier ? TIER_LABELS[entry.current_tier] : null;
  const tierColor = entry.current_tier ? TIER_COLORS[entry.current_tier] : null;

  const initials = entry.performer.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/artist/${entry.performer.slug}`}
      className="group flex flex-col items-center gap-1.5"
    >
      <div
        className={`relative h-[72px] w-[72px] rounded-full ring-2 ${tierRingColor} transition-transform group-hover:scale-105 ${
          !entry.verified ? "opacity-60" : ""
        }`}
      >
        {entry.performer.photo_url ? (
          <Image
            src={entry.performer.photo_url}
            alt={entry.performer.name}
            fill
            className="rounded-full object-cover"
            sizes="72px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple text-sm font-bold text-white">
            {initials}
          </div>
        )}
        {/* Verified badge dot */}
        {entry.verified && (
          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-bg bg-teal flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      <div className="w-[80px] text-center">
        <p className={`truncate text-xs font-medium ${entry.verified ? "text-[var(--text)]" : "text-gray"}`}>
          {entry.performer.name}
        </p>
        {tierLabel && tierColor ? (
          <span className={`text-[10px] font-medium ${tierColor.text}`}>
            {tierLabel}
          </span>
        ) : !entry.verified ? (
          <span className="text-[10px] text-light-gray">Discovered</span>
        ) : (
          <span className="text-[10px] text-pink">Network</span>
        )}
      </div>
    </Link>
  );
}

/* ─── Passport Stats Bar ─── */
function PassportStatsBar({ stats, fan }: { stats: PassportStats | null; fan: PassportFan }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-card border border-light-gray/10" />
        ))}
      </div>
    );
  }

  const items = [
    { label: "Shows", value: stats.totalShows, icon: Disc3, color: "text-pink" },
    { label: "Artists", value: stats.totalArtists + stats.totalDiscovered, icon: Users, color: "text-purple" },
    { label: "Venues", value: stats.uniqueVenues, icon: Building2, color: "text-blue" },
    { label: "Streak", value: stats.currentStreak > 0 ? `${stats.currentStreak}w` : "--", icon: Flame, color: "text-teal" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-light-gray/10 bg-bg-card p-3 text-center"
        >
          <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Full Stats Grid (expandable) ─── */
function FullStatsGrid({
  stats,
  fan,
  fanSlug,
}: {
  stats: PassportStats;
  fan: PassportFan;
  fanSlug: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label="Dancefloors"
        value={stats.totalShows}
        icon={Disc3}
        milestoneParams={getMilestoneForStat(stats.totalShows) ? {
          milestone: `${getMilestoneForStat(stats.totalShows)} Shows Attended`,
          value: String(getMilestoneForStat(stats.totalShows)),
          label: "shows",
          fanName: fan.name || "Fan",
          slug: fanSlug,
        } : null}
      />
      <StatCard label="Cities" value={stats.uniqueCities || "--"} icon={Compass} />
      <StatCard
        label="Artists Collected"
        value={stats.totalArtists}
        icon={Users}
        milestoneParams={getMilestoneForStat(stats.totalArtists) ? {
          milestone: `${getMilestoneForStat(stats.totalArtists)} Artists Collected`,
          value: String(getMilestoneForStat(stats.totalArtists)),
          label: "artists",
          fanName: fan.name || "Fan",
          slug: fanSlug,
        } : null}
      />
      <StatCard label="Artists Discovered" value={stats.totalDiscovered} icon={Globe} />
      <StatCard
        label="Venues"
        value={stats.uniqueVenues}
        icon={Building2}
        milestoneParams={getMilestoneForStat(stats.uniqueVenues) ? {
          milestone: `${getMilestoneForStat(stats.uniqueVenues)} Venues Visited`,
          value: String(getMilestoneForStat(stats.uniqueVenues)),
          label: "venues",
          fanName: fan.name || "Fan",
          slug: fanSlug,
        } : null}
      />
      <StatCard label="Favorite Genre" value={stats.favoriteGenre || "--"} icon={Music} />
      <StatCard
        label="Current Streak"
        value={stats.currentStreak > 0 ? `${stats.currentStreak}w` : "--"}
        icon={Flame}
      />
      <StatCard
        label="Member Since"
        value={new Date(fan.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        icon={Star}
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
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  span2,
  milestoneParams,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  span2?: boolean;
  milestoneParams?: { milestone: string; value: string; label: string; fanName: string; slug: string } | null;
}) {
  return (
    <div
      className={`rounded-xl border border-light-gray/10 bg-bg-card p-4 ${
        span2 ? "col-span-2" : ""
      }`}
    >
      <div className="mb-1 flex items-center justify-between text-gray">
        <div className="flex items-center gap-2">
          <Icon size={14} />
          <span className="text-xs uppercase tracking-wider">{label}</span>
        </div>
        {milestoneParams && (
          <ShareCardButton
            variant="milestone"
            params={milestoneParams}
            label={`Share ${label} milestone`}
          />
        )}
      </div>
      <div className="bg-gradient-to-r from-pink via-purple to-blue bg-clip-text text-3xl font-bold text-transparent">
        {value}
      </div>
    </div>
  );
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

function TimelineEntry({ entry, fanName, fanSlug, showShare }: { entry: PassportTimelineEntry; fanName?: string; fanSlug?: string; showShare?: boolean }) {
  const CaptureIcon = CAPTURE_ICONS[entry.capture_method] || Globe;
  const tierColor = entry.current_tier
    ? TIER_COLORS[entry.current_tier]
    : null;
  const tierLabel = entry.current_tier
    ? TIER_LABELS[entry.current_tier]
    : null;

  if (entry.verified) {
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
              {showShare && fanName && fanSlug && (
                <ShareCardButton
                  variant="artist"
                  params={{
                    name: entry.performer.name,
                    photo: entry.performer.photo_url || "",
                    tier: entry.current_tier || "network",
                    scans: String(entry.scan_count || 1),
                    venue: entry.venue?.name || "",
                    fanName,
                    slug: fanSlug,
                  }}
                  label={`Share ${entry.performer.name} card`}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            {showShare && fanName && fanSlug && (
              <ShareCardButton
                variant="discovery"
                params={{
                  artistName: entry.performer.name,
                  artistPhoto: entry.performer.photo_url || "",
                  genres: (entry.performer.genres || []).join(","),
                  fanName,
                  slug: fanSlug,
                }}
                label={`Share ${entry.performer.name} discovery`}
              />
            )}
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

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${fanName}'s DECIBEL Passport`,
        });
        toast.success("Shared successfully!");
      } else {
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

export function PassportClient({ fan, fanSlug, timeline: initialTimeline, isPublic = false, badges: initialBadges, viewerFanId }: PassportClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<PassportStats | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [timeline, setTimeline] = useState<PassportTimelineEntry[]>(initialTimeline);
  const [badges, setBadges] = useState<BadgeWithDefinition[]>(initialBadges || []);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<BadgeDefinition[]>([]);
  const [showUnlockToast, setShowUnlockToast] = useState(false);
  const [showFullStats, setShowFullStats] = useState(false);
  const [showFullTimeline, setShowFullTimeline] = useState(false);

  useEffect(() => {
    if (!isPublic) {
      fetch("/api/passport/stats")
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {});

      if (!initialBadges) {
        fetch("/api/badges")
          .then((r) => r.json())
          .then((data) => setBadges(data.badges || []))
          .catch(() => {});
      }
    }
  }, [isPublic, initialBadges]);

  async function evaluateBadges() {
    try {
      const res = await fetch("/api/badges/evaluate", { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.newBadges && data.newBadges.length > 0) {
        const newDefs = (data.newBadges as string[])
          .map((id) => BADGE_DEFINITIONS[id as keyof typeof BADGE_DEFINITIONS])
          .filter(Boolean);
        if (newDefs.length > 0) {
          setNewlyEarnedBadges(newDefs);
          setShowUnlockToast(true);
          newDefs.forEach((b) => toast.success(`Badge unlocked: ${b.name}!`));
        }
        const badgeRes = await fetch("/api/badges");
        if (badgeRes.ok) {
          const badgeData = await badgeRes.json();
          setBadges(badgeData.badges || []);
        }
      }
    } catch {
      // Silent fail
    }
  }

  useEffect(() => {
    if (searchParams.get("spotify") === "error") {
      toast.error("Failed to connect Spotify. Please try again.");
    }
  }, [searchParams]);

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

  // Dedupe artists for stamps — show each artist once, prefer verified entry with highest tier
  const artistStampMap = new Map<string, PassportTimelineEntry>();
  for (const entry of timeline) {
    const existing = artistStampMap.get(entry.performer.id);
    if (!existing || (entry.verified && !existing.verified) || (entry.verified && existing.verified && (entry.scan_count || 0) > (existing.scan_count || 0))) {
      artistStampMap.set(entry.performer.id, entry);
    }
  }
  const stamps = Array.from(artistStampMap.values());
  // Sort: verified first (by scan count desc), then discovered
  stamps.sort((a, b) => {
    if (a.verified && !b.verified) return -1;
    if (!a.verified && b.verified) return 1;
    return (b.scan_count || 0) - (a.scan_count || 0);
  });

  return (
    <div className="min-h-screen bg-bg pb-24 pt-20">
      <div className="mx-auto max-w-2xl px-4">

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PASSPORT HEADER — compact, like a real passport cover  */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="relative mb-6 rounded-2xl border border-light-gray/10 bg-gradient-to-b from-bg-card to-bg p-6 overflow-hidden">
          {/* Subtle passport texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 20px, currentColor 20px, currentColor 21px)",
          }} />

          <div className="relative flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink to-purple flex items-center justify-center text-xl font-bold text-white ring-2 ring-pink/30">
                {initials}
              </div>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold text-[var(--text)]">
                  {fan.name || "Anonymous Fan"}
                </h1>
                {!isPublic && (
                  <Link
                    href="/settings"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-light-gray/20 text-gray hover:text-pink hover:border-pink/30 transition-colors"
                    aria-label="Settings"
                  >
                    <Settings size={12} />
                  </Link>
                )}
              </div>
              <p className="text-sm text-gray">
                {fan.city && <span>{fan.city} · </span>}
                Since {memberSince}
              </p>

              {/* Quick stats inline */}
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span><span className="font-bold text-pink">{uniqueArtists}</span> <span className="text-gray">artists</span></span>
                <span><span className="font-bold text-purple">{verifiedCount}</span> <span className="text-gray">verified</span></span>
                <span><span className="font-bold text-blue">{timeline.length}</span> <span className="text-gray">shows</span></span>
              </div>

              <SocialCounts fanId={fan.id} isOwner={!isPublic} currentUserId={viewerFanId} />
            </div>

            {/* Share button */}
            {!isPublic && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-light-gray/20 bg-bg-card text-gray hover:text-pink hover:border-pink/30 transition-colors"
                  aria-label="Share passport"
                >
                  {showShareMenu ? <X size={14} /> : <Share2 size={14} />}
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
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ARTIST STAMPS — the hero section, like passport stamps */}
        {/* ═══════════════════════════════════════════════════════ */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text)]">
              Your Collection
            </h2>
            {!isPublic && (
              <button
                onClick={() => setShowDiscoverModal(true)}
                className="flex items-center gap-1.5 rounded-full bg-pink/10 px-3 py-1.5 text-xs font-medium text-pink hover:bg-pink/20 transition-colors"
              >
                <Plus size={14} />
                Add Artist
              </button>
            )}
          </div>

          {stamps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-light-gray/20 bg-bg-card/50 p-10 text-center">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full border-2 border-dashed border-pink/30 flex items-center justify-center">
                <Plus size={32} className="text-pink/40" />
              </div>
              <p className="font-medium text-[var(--text)]">
                {isPublic ? "No stamps yet" : "Start your collection"}
              </p>
              <p className="mt-1 text-sm text-gray">
                {isPublic
                  ? "This fan hasn't collected any artists yet."
                  : "Scan a QR at a show or discover artists to earn stamps."}
              </p>
              {!isPublic && (
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    onClick={() => setShowDiscoverModal(true)}
                    className="rounded-full bg-pink px-4 py-2 text-sm font-medium text-white hover:bg-pink/90 transition-colors"
                  >
                    Discover an Artist
                  </button>
                  <Link
                    href="/add"
                    className="rounded-full border border-yellow/30 px-4 py-2 text-sm font-medium text-yellow hover:bg-yellow/10 transition-colors"
                  >
                    Add to Decibel
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-light-gray/10 bg-bg-card/50 p-5">
              {/* Stamp grid */}
              <div className="grid grid-cols-4 gap-y-5 gap-x-2 justify-items-center">
                {stamps.map((entry) => (
                  <ArtistStamp key={entry.performer.id} entry={entry} />
                ))}
                {/* Add more CTA */}
                {!isPublic && (
                  <button
                    onClick={() => setShowDiscoverModal(true)}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="h-[72px] w-[72px] rounded-full border-2 border-dashed border-light-gray/20 flex items-center justify-center group-hover:border-pink/40 transition-colors">
                      <Plus size={24} className="text-light-gray/40 group-hover:text-pink/60 transition-colors" />
                    </div>
                    <span className="text-xs text-light-gray/60">Add more</span>
                  </button>
                )}
              </div>

              {/* Legend */}
              <div className="mt-5 flex items-center justify-center gap-4 border-t border-light-gray/10 pt-4 text-[10px] text-gray">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-pink" /> Network
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple" /> Early Access
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue" /> Secret
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal" /> Inner Circle
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STATS — compact bar, expandable to full grid            */}
        {/* ═══════════════════════════════════════════════════════ */}
        {!isPublic && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-[var(--text)]">Sound Stats</h2>
              {stats && (
                <button
                  onClick={() => setShowFullStats(!showFullStats)}
                  className="flex items-center gap-1 text-xs text-gray hover:text-pink transition-colors"
                >
                  {showFullStats ? "Less" : "More"}
                  {showFullStats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
            {showFullStats && stats ? (
              <FullStatsGrid stats={stats} fan={fan} fanSlug={fanSlug} />
            ) : (
              <PassportStatsBar stats={stats} fan={fan} />
            )}
          </section>
        )}

        {/* Badges */}
        <BadgeShowcase badges={badges} isPublic={isPublic} fanName={fan.name || "Fan"} fanSlug={fanSlug} />

        {/* Contact Suggestions + Activity Feed */}
        {!isPublic && (
          <>
            <ContactSuggestions />
            <ActivityFeed />
          </>
        )}

        {/* Recommendations */}
        {!isPublic && <Recommendations />}

        {/* Music Connections */}
        {!isPublic && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-bold text-[var(--text)]">
              Music Connections
            </h2>
            <SpotifyImport onImportComplete={() => { router.refresh(); evaluateBadges(); }} />
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* COLLECTION TIMELINE — detailed history below the fold  */}
        {/* ═══════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text)]">
              Collection Timeline
            </h2>
            {timeline.length > 5 && (
              <button
                onClick={() => setShowFullTimeline(!showFullTimeline)}
                className="flex items-center gap-1 text-xs text-gray hover:text-pink transition-colors"
              >
                {showFullTimeline ? "Show less" : `Show all (${timeline.length})`}
                {showFullTimeline ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>

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
              {Array.from(grouped.entries()).map(([monthKey, entries], groupIdx) => {
                // If not showing full timeline, only show first 5 entries total
                if (!showFullTimeline) {
                  let countBefore = 0;
                  for (const [k] of grouped.entries()) {
                    if (k === monthKey) break;
                    countBefore += grouped.get(k)!.length;
                  }
                  if (countBefore >= 5) return null;
                  const remaining = 5 - countBefore;
                  const visibleEntries = entries.slice(0, remaining);
                  if (visibleEntries.length === 0) return null;

                  return (
                    <div key={monthKey} className="mb-6">
                      <div className="sticky top-16 z-10 -ml-6 mb-3 flex items-center">
                        <div className="h-3 w-3 rounded-full bg-pink" />
                        <span className="ml-3 text-sm font-semibold text-gray">
                          {formatMonthYear(entries[0].created_at)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {visibleEntries.map((entry) => (
                          <TimelineEntry
                            key={entry.id}
                            entry={entry}
                            fanName={fan.name || "Fan"}
                            fanSlug={fanSlug}
                            showShare={!isPublic}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={monthKey} className="mb-6">
                    <div className="sticky top-16 z-10 -ml-6 mb-3 flex items-center">
                      <div className="h-3 w-3 rounded-full bg-pink" />
                      <span className="ml-3 text-sm font-semibold text-gray">
                        {formatMonthYear(entries[0].created_at)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {entries.map((entry) => (
                        <TimelineEntry
                          key={entry.id}
                          entry={entry}
                          fanName={fan.name || "Fan"}
                          fanSlug={fanSlug}
                          showShare={!isPublic}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
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

      {/* Discover Modal */}
      {!isPublic && (
        <DiscoverModal
          isOpen={showDiscoverModal}
          onClose={() => setShowDiscoverModal(false)}
          onDiscovered={(entry) => {
            setTimeline((prev) => [entry, ...prev]);
            setShowDiscoverModal(false);
            evaluateBadges();
          }}
        />
      )}

      {/* Badge Unlock Toast */}
      {showUnlockToast && newlyEarnedBadges.length > 0 && (
        <BadgeUnlockToast
          badges={newlyEarnedBadges}
          onDismiss={() => {
            setShowUnlockToast(false);
            setNewlyEarnedBadges([]);
          }}
        />
      )}
    </div>
  );
}
