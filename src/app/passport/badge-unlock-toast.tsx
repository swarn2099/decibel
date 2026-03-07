"use client";

import { useEffect } from "react";
import type { BadgeDefinition } from "@/lib/types/badges";

interface BadgeUnlockToastProps {
  badges: BadgeDefinition[];
  onDismiss: () => void;
}

const RARITY_PILL = {
  common: "bg-white/10 text-gray",
  rare: "bg-[#9B6DFF]/15 text-[#9B6DFF]",
  epic: "bg-[#FF4D6A]/15 text-[#FF4D6A]",
  legendary: "bg-[#FFD700]/15 text-[#FFD700]",
} as const;

export function BadgeUnlockToast({ badges, onDismiss }: BadgeUnlockToastProps) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (badges.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-light-gray/10 bg-[#0B0B0F] p-6 shadow-2xl animate-[scaleIn_0.4s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-pink">
          Badge{badges.length > 1 ? "s" : ""} Unlocked!
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {badges.map((badge) => (
            <div key={badge.id} className="text-center">
              <div className="mx-auto text-5xl animate-[badgePop_0.5s_ease-out]">
                {badge.icon}
              </div>
              <h3 className="mt-2 bg-gradient-to-r from-pink to-purple bg-clip-text text-lg font-bold text-transparent">
                {badge.name}
              </h3>
              <p className="mt-1 text-sm text-gray">{badge.description}</p>
              <span
                className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${RARITY_PILL[badge.rarity]}`}
              >
                {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          className="mt-6 w-full rounded-full bg-pink py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pink/80"
        >
          Nice!
        </button>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes badgePop {
          0% {
            transform: scale(0);
          }
          60% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
