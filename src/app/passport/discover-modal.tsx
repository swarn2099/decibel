"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Search,
  Check,
  ArrowLeft,
  Loader2,
  Music,
  Crown,
  ExternalLink,
} from "lucide-react";
import type { PassportTimelineEntry } from "@/lib/types/passport";
import type {
  LinkResolveResponse,
  DiscoverResponse,
  ResolvedArtist,
} from "@/lib/types/discovery";

interface DiscoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscovered: (entry: PassportTimelineEntry) => void;
}

type Step = "input" | "confirm" | "success";

const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  ra: "Resident Advisor",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

function SocialBadge({
  label,
  url,
}: {
  label: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-light-gray/20 px-2.5 py-1 text-[11px] text-gray hover:border-pink/30 hover:text-pink transition-colors"
    >
      {label}
      <ExternalLink size={10} />
    </a>
  );
}

export function DiscoverModal({
  isOpen,
  onClose,
  onDiscovered,
}: DiscoverModalProps) {
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolveData, setResolveData] = useState<LinkResolveResponse | null>(
    null
  );
  const [discoverResult, setDiscoverResult] = useState<{
    name: string;
    slug: string;
    isFounder: boolean;
  } | null>(null);

  if (!isOpen) return null;

  function reset() {
    setStep("input");
    setUrl("");
    setLoading(false);
    setError("");
    setResolveData(null);
    setDiscoverResult(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleResolve() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/discover/resolve-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data: LinkResolveResponse = await res.json();

      if (!data.resolved || (!data.artist && !data.existing_performer)) {
        setError(data.error || "Could not resolve artist from this link.");
        return;
      }

      setResolveData(data);
      setStep("confirm");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!resolveData) return;
    setLoading(true);
    setError("");

    try {
      const body = resolveData.existing_performer
        ? { performer_id: resolveData.existing_performer.id }
        : { resolved_artist: resolveData.artist };

      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: DiscoverResponse = await res.json();

      if (!data.success) {
        setError("Failed to add discovery. Please try again.");
        return;
      }

      if (data.already_discovered) {
        setError("You've already discovered this artist!");
        return;
      }

      const artistName =
        data.performer_name ||
        resolveData.existing_performer?.name ||
        resolveData.artist?.name ||
        "Artist";
      const artistSlug =
        data.performer_slug ||
        resolveData.existing_performer?.slug ||
        artistName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      setDiscoverResult({
        name: artistName,
        slug: artistSlug,
        isFounder: data.is_founder || false,
      });

      // Build timeline entry for immediate UI update
      const entry: PassportTimelineEntry = {
        id: data.collection_id || crypto.randomUUID(),
        performer: {
          id: data.performer_id || "",
          name: artistName,
          slug: artistSlug,
          photo_url:
            resolveData.existing_performer?.photo_url ||
            resolveData.artist?.photo_url ||
            null,
          genres: resolveData.artist?.genres || [],
          city: "",
        },
        venue: null,
        event_date: null,
        capture_method: "online",
        verified: false,
        created_at: new Date().toISOString(),
        scan_count: null,
        current_tier: null,
      };

      setStep("success");

      setTimeout(() => {
        onDiscovered(entry);
      }, 100);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const displayArtist: {
    name: string;
    photo_url: string | null;
    platform?: string;
    isExisting: boolean;
    artist?: ResolvedArtist;
  } | null = resolveData
    ? resolveData.existing_performer
      ? {
          name: resolveData.existing_performer.name,
          photo_url: resolveData.existing_performer.photo_url,
          platform: resolveData.artist?.platform,
          isExisting: true,
          artist: resolveData.artist,
        }
      : resolveData.artist
        ? {
            name: resolveData.artist.name,
            photo_url: resolveData.artist.photo_url || null,
            platform: resolveData.artist.platform,
            isExisting: false,
            artist: resolveData.artist,
          }
        : null
    : null;

  // Collect social links to display
  const socialLinks: { label: string; url: string }[] = [];
  if (resolveData?.artist) {
    const a = resolveData.artist;
    if (a.spotify_url) socialLinks.push({ label: "Spotify", url: a.spotify_url });
    if (a.soundcloud_url) socialLinks.push({ label: "SoundCloud", url: a.soundcloud_url });
    if (a.ra_url) socialLinks.push({ label: "RA", url: a.ra_url });
    if (a.instagram_handle)
      socialLinks.push({
        label: "Instagram",
        url: `https://instagram.com/${a.instagram_handle}`,
      });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0B0F]/95 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-light-gray/10 bg-bg-card p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray hover:text-[var(--text)] transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Step: Input */}
        {step === "input" && (
          <div>
            <h2 className="mb-1 text-xl font-bold text-[var(--text)]">
              Discover an Artist
            </h2>
            <p className="mb-6 text-sm text-gray">
              Paste a link from any platform — we&apos;ll pull their info automatically.
            </p>

            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleResolve()}
                placeholder="Paste an Instagram, SoundCloud, Spotify, or RA link..."
                className="w-full rounded-xl border border-light-gray/20 bg-bg px-4 py-3 pr-12 text-sm text-[var(--text)] placeholder:text-light-gray/50 focus:border-pink/50 focus:outline-none focus:ring-1 focus:ring-pink/30 transition-colors"
                autoFocus
              />
              <Search
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-light-gray/40"
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleResolve}
              disabled={loading || !url.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-pink py-3 text-sm font-semibold text-white transition-all hover:bg-pink/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Resolving...
                </>
              ) : (
                "Resolve Artist"
              )}
            </button>

            <p className="mt-4 text-center text-xs text-light-gray/50">
              Supported: Instagram, SoundCloud, Spotify, Resident Advisor,
              TikTok, YouTube
            </p>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && displayArtist && (
          <div>
            <button
              onClick={() => {
                setStep("input");
                setError("");
              }}
              className="mb-4 flex items-center gap-1 text-sm text-gray hover:text-[var(--text)] transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <div className="mb-6 flex flex-col items-center text-center">
              {/* Artist photo */}
              {displayArtist.photo_url ? (
                <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full ring-2 ring-pink/30">
                  <Image
                    src={displayArtist.photo_url}
                    alt={displayArtist.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ) : (
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple ring-2 ring-pink/30">
                  <Music size={36} className="text-white" />
                </div>
              )}

              <h3 className="text-lg font-bold text-[var(--text)]">
                {displayArtist.name}
              </h3>

              {/* Genres */}
              {displayArtist.artist?.genres && displayArtist.artist.genres.length > 0 && (
                <p className="mt-1 text-xs text-gray">
                  {displayArtist.artist.genres.slice(0, 3).join(" · ")}
                </p>
              )}

              {/* Platform badge */}
              {displayArtist.platform && (
                <span className="mt-2 inline-block rounded-full border border-light-gray/20 px-3 py-0.5 text-xs text-gray">
                  via {PLATFORM_LABELS[displayArtist.platform] || displayArtist.platform}
                </span>
              )}

              {/* Already in Decibel tag */}
              {displayArtist.isExisting && (
                <span className="mt-2 inline-block rounded-full bg-teal/10 px-3 py-0.5 text-xs font-medium text-teal">
                  Already in Decibel
                </span>
              )}

              {/* Social links found */}
              {socialLinks.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {socialLinks.map((link) => (
                    <SocialBadge
                      key={link.label}
                      label={link.label}
                      url={link.url}
                    />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="mb-4 text-center text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink py-3 text-sm font-semibold text-white transition-all hover:bg-pink/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Adding...
                </>
              ) : (
                "Add to Passport"
              )}
            </button>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && discoverResult && (
          <div className="flex flex-col items-center py-4 text-center">
            {discoverResult.isFounder ? (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow/10">
                  <Crown size={32} className="text-yellow" />
                </div>
                <h3 className="mb-1 text-lg font-bold text-[var(--text)]">
                  {discoverResult.name}
                </h3>
                <p className="mb-1 text-sm text-gray">
                  added to your passport!
                </p>
                <p className="mb-6 text-xs font-medium text-yellow">
                  You&apos;re the Founder — first to add this artist!
                </p>
              </>
            ) : (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
                  <Check size={32} className="text-teal" />
                </div>
                <h3 className="mb-1 text-lg font-bold text-[var(--text)]">
                  {discoverResult.name}
                </h3>
                <p className="mb-6 text-sm text-gray">
                  added to your passport!
                </p>
              </>
            )}

            <div className="flex gap-3">
              <Link
                href={`/artist/${discoverResult.slug}`}
                className="rounded-xl bg-pink/10 px-6 py-2.5 text-sm font-medium text-pink hover:bg-pink/20 transition-colors"
                onClick={handleClose}
              >
                View Profile
              </Link>
              <button
                onClick={handleClose}
                className="rounded-xl border border-light-gray/20 px-6 py-2.5 text-sm font-medium text-[var(--text)] hover:border-pink/30 hover:text-pink transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
