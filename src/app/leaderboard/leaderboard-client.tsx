"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Crown, Medal } from "lucide-react";
import { TIER_COLORS, TIER_LABELS } from "@/lib/tiers";
import type { FanEntry, PerformerEntry, LeaderboardData } from "./page";

type TimePeriod = "weekly" | "monthly" | "allTime";
type Tab = "fans" | "performers";

interface Props {
  data: {
    weekly: LeaderboardData;
    monthly: LeaderboardData;
    allTime: LeaderboardData;
  };
  currentFanId: string | null;
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

function FanPodium({
  entries,
  currentFanId,
}: {
  entries: FanEntry[];
  currentFanId: string | null;
}) {
  if (entries.length === 0) return null;

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [entries[1], entries[0], entries[2]].filter(Boolean);
  const heights = ["h-28", "h-36", "h-28"];
  const sizes = ["h-14 w-14", "h-18 w-18", "h-14 w-14"];
  const textSizes = ["text-base", "text-lg", "text-base"];

  return (
    <div className="flex items-end justify-center gap-3 md:gap-6">
      {podiumOrder.map((entry, i) => {
        const originalIndex =
          i === 0 ? 1 : i === 1 ? 0 : 2;
        const isYou = currentFanId === entry.fanId;
        const tierColor = TIER_COLORS[entry.topTier];

        return (
          <div
            key={entry.fanId}
            className={`flex ${heights[i]} w-28 flex-col items-center justify-end rounded-xl border bg-bg-card p-3 transition-all md:w-36 ${
              isYou
                ? "border-teal/60 shadow-[0_0_20px_rgba(0,212,170,0.3)]"
                : `${PODIUM_BORDERS[originalIndex]} ${PODIUM_GLOWS[originalIndex]}`
            }`}
          >
            {originalIndex === 0 && (
              <Crown
                size={20}
                className="mb-1 text-pink"
                fill="currentColor"
              />
            )}
            {originalIndex > 0 && (
              <Medal
                size={16}
                className={`mb-1 ${PODIUM_TEXT[originalIndex]}`}
              />
            )}
            <Initials name={entry.name} className={`${sizes[i]} text-sm`} />
            <p
              className={`mt-2 truncate text-center font-semibold ${textSizes[i]}`}
              style={{ color: "var(--text)" }}
            >
              {entry.name}
            </p>
            <p className={`text-xs font-bold ${PODIUM_TEXT[originalIndex]}`}>
              {entry.count} collected
            </p>
            <span
              className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${tierColor?.bg || ""} ${tierColor?.text || ""}`}
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
      })}
    </div>
  );
}

function PerformerPodium({ entries }: { entries: PerformerEntry[] }) {
  if (entries.length === 0) return null;

  const podiumOrder = [entries[1], entries[0], entries[2]].filter(Boolean);
  const heights = ["h-28", "h-36", "h-28"];
  const sizes = ["h-14 w-14", "h-18 w-18", "h-14 w-14"];
  const textSizes = ["text-base", "text-lg", "text-base"];

  return (
    <div className="flex items-end justify-center gap-3 md:gap-6">
      {podiumOrder.map((entry, i) => {
        const originalIndex =
          i === 0 ? 1 : i === 1 ? 0 : 2;

        return (
          <Link
            key={entry.performerId}
            href={`/artist/${entry.slug}`}
            className={`flex ${heights[i]} w-28 flex-col items-center justify-end rounded-xl border bg-bg-card p-3 transition-all hover:scale-105 md:w-36 ${PODIUM_BORDERS[originalIndex]} ${PODIUM_GLOWS[originalIndex]}`}
          >
            {originalIndex === 0 && (
              <Crown
                size={20}
                className="mb-1 text-pink"
                fill="currentColor"
              />
            )}
            {originalIndex > 0 && (
              <Medal
                size={16}
                className={`mb-1 ${PODIUM_TEXT[originalIndex]}`}
              />
            )}
            <PerformerAvatar
              photoUrl={entry.photoUrl}
              name={entry.name}
              className={`${sizes[i]} text-sm`}
            />
            <p
              className={`mt-2 truncate text-center font-semibold ${textSizes[i]}`}
              style={{ color: "var(--text)" }}
            >
              {entry.name}
            </p>
            <p className={`text-xs font-bold ${PODIUM_TEXT[originalIndex]}`}>
              {entry.fanCount} fans
            </p>
          </Link>
        );
      })}
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

export function LeaderboardClient({ data, currentFanId }: Props) {
  const [tab, setTab] = useState<Tab>("fans");
  const [period, setPeriod] = useState<TimePeriod>("allTime");

  const currentData = data[period];
  const entries = tab === "fans" ? currentData.fans : currentData.performers;
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
        {(["fans", "performers"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-wide transition-all ${
              tab === t
                ? "bg-pink text-white shadow-[0_0_16px_rgba(255,77,106,0.3)]"
                : "bg-bg-card text-gray hover:text-pink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Time filter */}
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

      {/* Content */}
      {entries.length === 0 ? (
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
          {/* TODO: Position change arrows omitted for v1 — would need a snapshots table to track historical rankings */}
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
