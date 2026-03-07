"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Crown, Medal, Sparkles, Users } from "lucide-react";
import { TIER_COLORS, TIER_LABELS } from "@/lib/tiers";
import type { FanEntry, PerformerEntry, LeaderboardData, FounderEntry, FoundedArtistEntry } from "./page";

type TimePeriod = "weekly" | "monthly" | "allTime";
type Tab = "fans" | "performers" | "founders";
type FounderView = "byUser" | "byArtist";

interface Props {
  data: {
    weekly: LeaderboardData;
    monthly: LeaderboardData;
    allTime: LeaderboardData;
  };
  currentFanId: string | null;
  founderData: {
    topFounders: FounderEntry[];
    foundedArtists: FoundedArtistEntry[];
  };
}

const TIME_LABELS: Record<TimePeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  allTime: "All-Time",
};

const PODIUM_GLOWS = [
  "shadow-[0_0_30px_rgba(255,77,106,0.4)]", // #1 pink
  "shadow-[0_0_30px_rgba(155,109,255,0.4)]", // #2 purple
  "shadow-[0_0_30px_rgba(77,154,255,0.4)]", // #3 blue
];

const PODIUM_BORDERS = [
  "border-pink/40",
  "border-purple/40",
  "border-blue/40",
];

const PODIUM_TEXT = ["text-pink", "text-purple", "text-blue"];

function Initials({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-bg font-bold text-gray ${className || ""}`}
    >
      {initials}
    </div>
  );
}

function PerformerAvatar({
  photoUrl,
  name,
  className,
}: {
  photoUrl: string | null;
  name: string;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`rounded-full object-cover ${className || ""}`}
      />
    );
  }
  return <Initials name={name} className={className} />;
}

function FanPodiumCard({
  entry,
  rank,
  isCenter,
  isYou,
}: {
  entry: FanEntry;
  rank: number;
  isCenter: boolean;
  isYou: boolean;
}) {
  const tierColor = TIER_COLORS[entry.topTier];
  const colorIdx = rank - 1;

  return (
    <div
      className={`flex w-full max-w-[10rem] flex-col items-center rounded-xl border bg-bg-card px-3 py-4 transition-all ${
        isCenter ? "min-h-[10rem]" : "min-h-[8.5rem]"
      } ${
        isYou
          ? "border-teal/60 shadow-[0_0_20px_rgba(0,212,170,0.3)]"
          : `${PODIUM_BORDERS[colorIdx] || "border-light-gray/10"} ${PODIUM_GLOWS[colorIdx] || ""}`
      }`}
    >
      {rank === 1 && (
        <Crown size={20} className="mb-1 text-pink" fill="currentColor" />
      )}
      {rank > 1 && (
        <Medal size={16} className={`mb-1 ${PODIUM_TEXT[colorIdx] || "text-gray"}`} />
      )}
      <Initials
        name={entry.name}
        className={`${isCenter ? "h-16 w-16" : "h-12 w-12"} text-sm`}
      />
      <p
        className="mt-2 w-full truncate text-center text-sm font-semibold"
        style={{ color: "var(--text)" }}
      >
        {entry.name}
      </p>
      <p className={`text-xs font-bold ${PODIUM_TEXT[colorIdx] || "text-gray"}`}>
        {entry.count} collected
      </p>
      <span
        className={`mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tierColor?.bg || ""} ${tierColor?.text || ""}`}
      >
        {TIER_LABELS[entry.topTier] || entry.topTier}
      </span>
      {isYou && (
        <span className="mt-1 rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-bold text-teal">
          YOU
        </span>
      )}
    </div>
  );
}

function FanPodium({
  entries,
  currentFanId,
}: {
  entries: FanEntry[];
  currentFanId: string | null;
}) {
  if (entries.length === 0) return null;

  // With < 3 entries, just show them in order centered
  if (entries.length < 3) {
    return (
      <div className="flex items-end justify-center gap-4">
        {entries.map((entry, i) => (
          <FanPodiumCard
            key={entry.fanId}
            entry={entry}
            rank={i + 1}
            isCenter={i === 0}
            isYou={currentFanId === entry.fanId}
          />
        ))}
      </div>
    );
  }

  // Podium order: 2nd, 1st, 3rd
  return (
    <div className="flex items-end justify-center gap-4">
      <FanPodiumCard entry={entries[1]} rank={2} isCenter={false} isYou={currentFanId === entries[1].fanId} />
      <FanPodiumCard entry={entries[0]} rank={1} isCenter isYou={currentFanId === entries[0].fanId} />
      <FanPodiumCard entry={entries[2]} rank={3} isCenter={false} isYou={currentFanId === entries[2].fanId} />
    </div>
  );
}

function PerformerPodium({ entries }: { entries: PerformerEntry[] }) {
  if (entries.length === 0) return null;

  function Card({ entry, rank, isCenter }: { entry: PerformerEntry; rank: number; isCenter: boolean }) {
    const colorIdx = rank - 1;
    return (
      <Link
        key={entry.performerId}
        href={`/artist/${entry.slug}`}
        className={`flex w-full max-w-[10rem] flex-col items-center rounded-xl border bg-bg-card px-3 py-4 transition-all hover:scale-105 ${
          isCenter ? "min-h-[10rem]" : "min-h-[8.5rem]"
        } ${PODIUM_BORDERS[colorIdx] || "border-light-gray/10"} ${PODIUM_GLOWS[colorIdx] || ""}`}
      >
        {rank === 1 && <Crown size={20} className="mb-1 text-pink" fill="currentColor" />}
        {rank > 1 && <Medal size={16} className={`mb-1 ${PODIUM_TEXT[colorIdx] || "text-gray"}`} />}
        <PerformerAvatar photoUrl={entry.photoUrl} name={entry.name} className={`${isCenter ? "h-16 w-16" : "h-12 w-12"} text-sm`} />
        <p className="mt-2 w-full truncate text-center text-sm font-semibold" style={{ color: "var(--text)" }}>{entry.name}</p>
        <p className={`text-xs font-bold ${PODIUM_TEXT[colorIdx] || "text-gray"}`}>{entry.fanCount} fans</p>
      </Link>
    );
  }

  if (entries.length < 3) {
    return (
      <div className="flex items-end justify-center gap-4">
        {entries.map((entry, i) => <Card key={entry.performerId} entry={entry} rank={i + 1} isCenter={i === 0} />)}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-center gap-4">
      <Card entry={entries[1]} rank={2} isCenter={false} />
      <Card entry={entries[0]} rank={1} isCenter />
      <Card entry={entries[2]} rank={3} isCenter={false} />
    </div>
  );
}

function RankedList({
  entries,
  maxCount,
  type,
  currentFanId,
}: {
  entries: (FanEntry | PerformerEntry)[];
  maxCount: number;
  type: Tab;
  currentFanId: string | null;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-6 space-y-2">
      {entries.map((entry) => {
        const count =
          type === "fans"
            ? (entry as FanEntry).count
            : (entry as PerformerEntry).fanCount;
        const fillWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const isFan = type === "fans";
        const isYou =
          isFan && currentFanId === (entry as FanEntry).fanId;

        return (
          <div
            key={
              isFan
                ? (entry as FanEntry).fanId
                : (entry as PerformerEntry).performerId
            }
            className={`group flex items-center gap-3 rounded-lg border bg-bg-card px-4 py-3 transition-all ${
              isYou
                ? "border-teal/40 shadow-[0_0_12px_rgba(0,212,170,0.2)]"
                : "border-light-gray/10 hover:border-pink/20"
            }`}
          >
            <span className="w-6 text-center text-sm font-bold text-gray">
              {entry.rank}
            </span>

            {!isFan && (
              <PerformerAvatar
                photoUrl={(entry as PerformerEntry).photoUrl}
                name={entry.name}
                className="h-8 w-8 text-xs"
              />
            )}
            {isFan && (
              <Initials name={entry.name} className="h-8 w-8 text-xs" />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {!isFan ? (
                  <Link
                    href={`/artist/${(entry as PerformerEntry).slug}`}
                    className="truncate text-sm font-medium hover:text-pink"
                    style={{ color: "var(--text)" }}
                  >
                    {entry.name}
                  </Link>
                ) : (
                  <span
                    className="truncate text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {entry.name}
                  </span>
                )}
                {isFan && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TIER_COLORS[(entry as FanEntry).topTier]?.bg || ""} ${TIER_COLORS[(entry as FanEntry).topTier]?.text || ""}`}>
                    {TIER_LABELS[(entry as FanEntry).topTier] || (entry as FanEntry).topTier}
                  </span>
                )}
                {isYou && (
                  <span className="shrink-0 rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-bold text-teal">
                    YOU
                  </span>
                )}
              </div>
              {/* Stat bar */}
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-light-gray/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink to-purple transition-all duration-500"
                  style={{ width: `${fillWidth}%` }}
                />
              </div>
            </div>

            <span className="shrink-0 text-sm font-bold text-gray">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function FoundersView({
  founderData,
  currentFanId,
}: {
  founderData: Props["founderData"];
  currentFanId: string | null;
}) {
  const [view, setView] = useState<FounderView>("byUser");

  return (
    <div>
      {/* Sub-view toggle */}
      <div className="mb-6 flex justify-center gap-1">
        <button
          onClick={() => setView("byUser")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            view === "byUser"
              ? "bg-yellow/20 text-yellow"
              : "text-gray hover:text-yellow"
          }`}
        >
          <Users size={12} />
          Top Founders
        </button>
        <button
          onClick={() => setView("byArtist")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            view === "byArtist"
              ? "bg-yellow/20 text-yellow"
              : "text-gray hover:text-yellow"
          }`}
        >
          <Sparkles size={12} />
          Founded Artists
        </button>
      </div>

      {view === "byUser" ? (
        <div className="space-y-2">
          {founderData.topFounders.length === 0 ? (
            <div className="mt-16 text-center">
              <Crown size={48} className="mx-auto mb-4 text-light-gray/30" />
              <p className="text-lg font-medium text-gray">No founders yet</p>
              <p className="mt-1 text-sm text-light-gray">
                Be the first to add an artist to Decibel
              </p>
            </div>
          ) : (
            founderData.topFounders.map((entry) => {
              const isYou = currentFanId === entry.fanId;
              const maxCount = founderData.topFounders[0]?.foundedCount || 1;
              const fillWidth = (entry.foundedCount / maxCount) * 100;

              return (
                <Link
                  key={entry.fanId}
                  href={`/passport/${entry.slug}`}
                  className={`group flex items-center gap-3 rounded-lg border bg-bg-card px-4 py-3 transition-all ${
                    isYou
                      ? "border-teal/40 shadow-[0_0_12px_rgba(0,212,170,0.2)]"
                      : "border-light-gray/10 hover:border-yellow/20"
                  }`}
                >
                  <span className="w-6 text-center text-sm font-bold text-gray">
                    {entry.rank}
                  </span>
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.name}
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-yellow/20"
                    />
                  ) : (
                    <Initials name={entry.name} className="h-8 w-8 text-xs" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                        {entry.name}
                      </span>
                      <Crown size={12} className="shrink-0 text-yellow" />
                      {isYou && (
                        <span className="shrink-0 rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-bold text-teal">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-light-gray/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-yellow to-pink transition-all duration-500"
                        style={{ width: `${fillWidth}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-yellow">
                    {entry.foundedCount} {entry.foundedCount === 1 ? "artist" : "artists"}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {founderData.foundedArtists.length === 0 ? (
            <div className="mt-16 text-center">
              <Sparkles size={48} className="mx-auto mb-4 text-light-gray/30" />
              <p className="text-lg font-medium text-gray">No founded artists yet</p>
            </div>
          ) : (
            founderData.foundedArtists.map((entry) => (
              <Link
                key={entry.performerId}
                href={`/artist/${entry.slug}`}
                className="group flex items-center gap-3 rounded-lg border border-light-gray/10 bg-bg-card px-4 py-3 transition-all hover:border-yellow/20"
              >
                <span className="w-6 text-center text-sm font-bold text-gray">
                  {entry.rank}
                </span>
                <PerformerAvatar
                  photoUrl={entry.photoUrl}
                  name={entry.name}
                  className="h-10 w-10 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {entry.name}
                  </p>
                  <p className="text-xs text-light-gray">
                    Founded by{" "}
                    <span className="text-yellow">{entry.founderName}</span>
                  </p>
                </div>
                {entry.followerCount > 0 && (
                  <span className="shrink-0 text-sm font-bold text-gray">
                    {formatFollowers(entry.followerCount)}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function LeaderboardClient({ data, currentFanId, founderData }: Props) {
  const [tab, setTab] = useState<Tab>("fans");
  const [period, setPeriod] = useState<TimePeriod>("allTime");

  const currentData = data[period];
  const entries = tab === "fans" ? currentData.fans : tab === "performers" ? currentData.performers : [];
  const podiumEntries = entries.slice(0, 3);
  const listEntries = entries.slice(3);
  const maxCount =
    entries.length > 0
      ? tab === "fans"
        ? (entries[0] as FanEntry).count
        : (entries[0] as PerformerEntry).fanCount
      : 0;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <Trophy size={28} className="text-yellow" />
        <h1 className="bg-gradient-to-r from-pink via-purple to-blue bg-clip-text text-3xl font-bold tracking-wider text-transparent">
          LEADERBOARD
        </h1>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex justify-center gap-2">
        {(["fans", "performers", "founders"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-wide transition-all ${
              tab === t
                ? t === "founders"
                  ? "bg-yellow text-black shadow-[0_0_16px_rgba(255,215,0,0.3)]"
                  : "bg-pink text-white shadow-[0_0_16px_rgba(255,77,106,0.3)]"
                : "bg-bg-card text-gray hover:text-pink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Time filter — hide for founders (founders are all-time) */}
      {tab !== "founders" && (
        <div className="mb-8 flex justify-center gap-1">
          {(Object.keys(TIME_LABELS) as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                period === p
                  ? "bg-purple/20 text-purple"
                  : "text-gray hover:text-purple"
              }`}
            >
              {TIME_LABELS[p]}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {tab === "founders" ? (
        <FoundersView founderData={founderData} currentFanId={currentFanId} />
      ) : entries.length === 0 ? (
        <div className="mt-16 text-center">
          <Trophy size={48} className="mx-auto mb-4 text-light-gray/30" />
          <p className="text-lg font-medium text-gray">No activity yet</p>
          <p className="mt-1 text-sm text-light-gray">
            {period === "weekly"
              ? "Check back after some shows this week"
              : period === "monthly"
                ? "No collections recorded this month"
                : "Be the first to collect a performer"}
          </p>
        </div>
      ) : (
        <>
          {/* Podium (top 3) */}
          {tab === "fans" ? (
            <FanPodium entries={podiumEntries as FanEntry[]} currentFanId={currentFanId} />
          ) : (
            <PerformerPodium entries={podiumEntries as PerformerEntry[]} />
          )}

          {/* Ranked list (4-10) */}
          <RankedList
            entries={listEntries}
            maxCount={maxCount}
            type={tab}
            currentFanId={currentFanId}
          />
        </>
      )}
    </div>
  );
}
