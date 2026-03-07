"use client";

import { useState } from "react";
import type { BadgeWithDefinition, BadgeCategory } from "@/lib/types/badges";
import { ShareCardButton } from "./share-cards";

interface BadgeShowcaseProps {
  badges: BadgeWithDefinition[];
  isPublic?: boolean;
  fanName?: string;
  fanSlug?: string;
}

const RARITY_STYLES = {
  common: "border-white/20",
  rare: "border-[#9B6DFF]",
  epic: "border-[#FF4D6A]",
  legendary: "border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.25)]",
} as const;

const RARITY_LABELS = {
  common: "bg-white/10 text-gray",
  rare: "bg-[#9B6DFF]/15 text-[#9B6DFF]",
  epic: "bg-[#FF4D6A]/15 text-[#FF4D6A]",
  legendary: "bg-[#FFD700]/15 text-[#FFD700]",
} as const;

const CATEGORIES: { key: BadgeCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "discovery", label: "Discovery" },
  { key: "attendance", label: "Attendance" },
  { key: "exploration", label: "Exploration" },
  { key: "streak", label: "Streak" },
  { key: "social", label: "Social" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BadgeShowcase({ badges, isPublic = false, fanName, fanSlug }: BadgeShowcaseProps) {
  const [activeCategory, setActiveCategory] = useState<BadgeCategory | "all">("all");

  // Hide entire section on public view if no badges
  if (isPublic && badges.length === 0) return null;

  const filtered =
    activeCategory === "all"
      ? badges
      : badges.filter((b) => b.definition.category === activeCategory);

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold text-[var(--text)]">
        Badges ({badges.length})
      </h2>

      {/* Category filter tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const count =
            cat.key === "all"
              ? badges.length
              : badges.filter((b) => b.definition.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.key
                  ? "bg-pink text-white"
                  : "bg-white/5 text-gray hover:bg-white/10"
              }`}
            >
              {cat.label}
              {count > 0 && (
                <span className="ml-1 opacity-70">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Badge grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((badge) => (
            <div
              key={badge.badge_id}
              className={`rounded-xl border-2 ${RARITY_STYLES[badge.definition.rarity]} bg-white/5 p-4 transition-all hover:bg-white/8`}
            >
              <div className="mb-2 text-center text-3xl">{badge.definition.icon}</div>
              <h3 className="text-center text-sm font-bold text-[var(--text)]">
                {badge.definition.name}
              </h3>
              <p className="mt-1 text-center text-xs text-gray">
                {badge.definition.description}
              </p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RARITY_LABELS[badge.definition.rarity]}`}
                >
                  {badge.definition.rarity.charAt(0).toUpperCase() + badge.definition.rarity.slice(1)}
                </span>
              </div>
              <p className="mt-2 text-center text-[10px] text-light-gray">
                {formatDate(badge.earned_at)}
              </p>
              {!isPublic && fanName && fanSlug && (
                <div className="mt-2 flex justify-center">
                  <ShareCardButton
                    variant="badge"
                    params={{
                      badgeName: badge.definition.name,
                      badgeDesc: badge.definition.description,
                      badgeIcon: badge.definition.icon,
                      rarity: badge.definition.rarity,
                      category: badge.definition.category,
                      earnedAt: badge.earned_at,
                      fanName,
                      slug: fanSlug,
                    }}
                    label={`Share ${badge.definition.name} badge`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !isPublic ? (
        <div className="rounded-xl border border-light-gray/10 bg-bg-card p-8 text-center">
          <p className="text-3xl mb-3">🏆</p>
          <p className="text-gray">
            No badges yet. Start collecting artists to earn your first badge!
          </p>
        </div>
      ) : null}
    </section>
  );
}
