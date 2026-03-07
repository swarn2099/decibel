"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

type ShareCardVariant = "artist" | "badge" | "milestone" | "discovery" | "stats";

interface ShareCardButtonProps {
  variant: ShareCardVariant;
  params: Record<string, string>;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}

const VARIANT_PATHS: Record<ShareCardVariant, string> = {
  artist: "/api/passport/share-card/artist",
  badge: "/api/passport/share-card/badge",
  milestone: "/api/passport/share-card/milestone",
  discovery: "/api/passport/share-card/discovery",
  stats: "/api/passport/share-card",
};

const VARIANT_FILENAMES: Record<ShareCardVariant, string> = {
  artist: "decibel-artist-card.png",
  badge: "decibel-badge-card.png",
  milestone: "decibel-milestone-card.png",
  discovery: "decibel-discovery-card.png",
  stats: "decibel-passport.png",
};

async function generateAndShare(variant: ShareCardVariant, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const endpoint = VARIANT_PATHS[variant];
  const filename = VARIANT_FILENAMES[variant];

  const response = await fetch(`${endpoint}?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to generate image");

  const blob = await response.blob();
  const file = new File([blob], filename, { type: "image/png" });

  // Try Web Share API on mobile
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "DECIBEL",
    });
    toast.success("Shared successfully!");
  } else {
    // Desktop fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Card downloaded!");
  }
}

export function ShareCardButton({
  variant,
  params,
  label,
  className = "",
  iconOnly = true,
}: ShareCardButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      await generateAndShare(variant, params);
    } catch {
      toast.error("Failed to generate share card");
    } finally {
      setLoading(false);
    }
  }

  if (iconOnly) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex h-7 w-7 items-center justify-center rounded-full border border-light-gray/20 bg-transparent text-light-gray hover:text-pink hover:border-pink/30 transition-colors disabled:opacity-50 ${className}`}
        aria-label={label || `Share ${variant} card`}
        title={label || `Share ${variant} card`}
      >
        {loading ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-light-gray/30 border-t-pink" />
        ) : (
          <Share2 size={12} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray hover:text-pink transition-colors disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-light-gray/30 border-t-pink" />
      ) : (
        <Share2 size={14} />
      )}
      {label || "Share"}
    </button>
  );
}

// Milestone thresholds for stat share triggers
const MILESTONE_THRESHOLDS = [10, 25, 50, 100];

export function getMilestoneForStat(value: number): number | null {
  // Find the highest threshold this value has crossed
  for (let i = MILESTONE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (value >= MILESTONE_THRESHOLDS[i]) {
      return MILESTONE_THRESHOLDS[i];
    }
  }
  return null;
}
