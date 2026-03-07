"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Search,
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Music,
  Crown,
  ExternalLink,
  Users,
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

interface SpotifyResult {
  id: string;
  name: string;
  photo_url: string | null;
  genres: string[];
  spotify_url: string;
  followers: number;
}

interface ExistingPerformer {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[] | null;
  follower_count: number | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  ra: "Resident Advisor",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

function isUrl(input: string): boolean {
  const trimmed = input.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    /^(www\.)?(instagram|soundcloud|spotify|open\.spotify|ra\.co|tiktok|youtube)\.com/i.test(trimmed)
  );
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function SocialBadge({ label, url }: { label: string; url: string }) {
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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  // Link resolve state
  const [resolveData, setResolveData] = useState<LinkResolveResponse | null>(null);

  // Spotify search state
  const [spotifyResults, setSpotifyResults] = useState<SpotifyResult[]>([]);
  const [existingResults, setExistingResults] = useState<ExistingPerformer[]>([]);
  const [selectedSpotify, setSelectedSpotify] = useState<SpotifyResult | null>(null);

  // Result state
  const [discoverResult, setDiscoverResult] = useState<{
    name: string;
    slug: string;
    isFounder: boolean;
  } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (!isOpen) return null;

  function reset() {
    setStep("input");
    setInput("");
    setLoading(false);
    setSearching(false);
    setError("");
    setResolveData(null);
    setSpotifyResults([]);
    setExistingResults([]);
    setSelectedSpotify(null);
    setDiscoverResult(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // Debounced Spotify search for text input
  function handleInputChange(value: string) {
    setInput(value);
    setError("");

    // If it looks like a URL, don't search — wait for submit
    if (isUrl(value)) {
      setSpotifyResults([]);
      setExistingResults([]);
      clearTimeout(debounceRef.current);
      return;
    }

    // Text search — debounce Spotify search
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSpotifyResults([]);
      setExistingResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(value.trim())}`
        );
        const data = await res.json();
        setExistingResults(data.existing || []);
        setSpotifyResults(data.results || []);
        if (data.spotify_error) {
          console.warn("[discover] Spotify search error:", data.spotify_error);
        }
      } catch (err) {
        console.error("[discover] Search fetch failed:", err);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  // Handle submit — URL goes to resolve, text goes to Spotify add
  async function handleSubmit() {
    if (!input.trim()) return;

    if (isUrl(input)) {
      await handleResolveLink();
    }
    // For text: user selects from results list, no submit needed
  }

  async function handleResolveLink() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/discover/resolve-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input.trim() }),
      });
      const data: LinkResolveResponse = await res.json();

      if (!data.resolved || (!data.artist && !data.existing_performer)) {
        setError(data.error || "Could not resolve artist from this link.");
        return;
      }

      setResolveData(data);
      setSelectedSpotify(null);
      setStep("confirm");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Select a Spotify result — go to confirm via add-artist flow
  function selectSpotifyArtist(artist: SpotifyResult) {
    setSelectedSpotify(artist);
    setResolveData(null);
    setStep("confirm");
  }

  // Confirm — different paths for link resolve vs Spotify add
  async function handleConfirm() {
    setLoading(true);
    setError("");

    try {
      if (selectedSpotify) {
        // Spotify add flow
        const res = await fetch("/api/add-artist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spotify_id: selectedSpotify.id }),
        });
        const data = await res.json();

        if (data.already_exists) {
          // Still a success — add to discoveries
          setDiscoverResult({
            name: data.performer.name,
            slug: data.performer.slug,
            isFounder: false,
          });

          const entry: PassportTimelineEntry = {
            id: crypto.randomUUID(),
            performer: {
              id: data.performer.id,
              name: data.performer.name,
              slug: data.performer.slug,
              photo_url: selectedSpotify.photo_url,
              genres: selectedSpotify.genres,
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
          setTimeout(() => onDiscovered(entry), 100);
          return;
        }

        if (!data.success) {
          setError(data.error || "Failed to add artist");
          return;
        }

        setDiscoverResult({
          name: data.performer.name,
          slug: data.performer.slug,
          isFounder: data.is_founder || false,
        });

        const entry: PassportTimelineEntry = {
          id: crypto.randomUUID(),
          performer: {
            id: data.performer.id,
            name: data.performer.name,
            slug: data.performer.slug,
            photo_url: selectedSpotify.photo_url,
            genres: selectedSpotify.genres,
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
        setTimeout(() => onDiscovered(entry), 100);
      } else if (resolveData) {
        // Link resolve flow
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
        setTimeout(() => onDiscovered(entry), 100);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Build display data for confirm step
  const displayArtist = selectedSpotify
    ? {
        name: selectedSpotify.name,
        photo_url: selectedSpotify.photo_url,
        platform: "spotify" as const,
        isExisting: false,
        genres: selectedSpotify.genres,
        followers: selectedSpotify.followers,
      }
    : resolveData
      ? resolveData.existing_performer
        ? {
            name: resolveData.existing_performer.name,
            photo_url: resolveData.existing_performer.photo_url,
            platform: resolveData.artist?.platform,
            isExisting: true,
            genres: resolveData.artist?.genres,
            followers: undefined as number | undefined,
          }
        : resolveData.artist
          ? {
              name: resolveData.artist.name,
              photo_url: resolveData.artist.photo_url || null,
              platform: resolveData.artist.platform,
              isExisting: false,
              genres: resolveData.artist.genres,
              followers: undefined as number | undefined,
            }
          : null
      : null;

  // Social links for link-resolved artists
  const socialLinks: { label: string; url: string }[] = [];
  if (resolveData?.artist) {
    const a = resolveData.artist;
    if (a.spotify_url) socialLinks.push({ label: "Spotify", url: a.spotify_url });
    if (a.soundcloud_url) socialLinks.push({ label: "SoundCloud", url: a.soundcloud_url });
    if (a.ra_url) socialLinks.push({ label: "RA", url: a.ra_url });
    if (a.instagram_handle)
      socialLinks.push({ label: "Instagram", url: `https://instagram.com/${a.instagram_handle}` });
  }

  const inputIsUrl = isUrl(input);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-light-gray/10 bg-bg-card p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 text-gray hover:text-[var(--text)] transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Step: Input */}
        {step === "input" && (
          <div>
            <h2 className="mb-1 text-xl font-bold text-[var(--text)]">
              Add an Artist
            </h2>
            <p className="mb-5 text-sm text-gray">
              Search by name or paste a link from any platform.
            </p>

            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-light-gray/40"
              />
              <input
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && inputIsUrl && handleSubmit()}
                placeholder="Search artist name or paste a link..."
                className="w-full rounded-xl border border-light-gray/20 bg-bg py-3 pl-11 pr-4 text-sm text-[var(--text)] placeholder:text-light-gray/50 focus:border-pink/50 focus:outline-none focus:ring-1 focus:ring-pink/30 transition-colors"
                autoFocus
              />
            </div>

            {/* URL detected — show resolve button */}
            {inputIsUrl && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-pink py-3 text-sm font-semibold text-white transition-all hover:bg-pink/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Resolving...
                  </>
                ) : (
                  "Resolve Link"
                )}
              </button>
            )}

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            {/* Searching indicator */}
            {searching && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray">
                <Loader2 size={14} className="animate-spin" />
                Searching...
              </div>
            )}

            {/* Existing Decibel artists */}
            {!inputIsUrl && existingResults.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal">
                  Already on Decibel
                </h3>
                <div className="rounded-xl border border-light-gray/10 overflow-hidden">
                  {existingResults.map((p) => (
                    <Link
                      key={p.id}
                      href={`/artist/${p.slug}`}
                      onClick={handleClose}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-light-gray/5 border-b border-light-gray/5 last:border-b-0"
                    >
                      {p.photo_url ? (
                        <Image
                          src={p.photo_url}
                          alt={p.name}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink/20 to-purple/20 text-xs font-bold text-gray">
                          {p.name[0]}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        {p.genres && p.genres.length > 0 && (
                          <p className="truncate text-xs text-light-gray">
                            {p.genres.slice(0, 3).join(" · ")}
                          </p>
                        )}
                      </div>
                      <Check size={14} className="shrink-0 text-teal" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Spotify results */}
            {!inputIsUrl && spotifyResults.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-pink">
                  Add from Spotify
                </h3>
                <div className="rounded-xl border border-light-gray/10 overflow-hidden">
                  {spotifyResults.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => selectSpotifyArtist(a)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-light-gray/5 border-b border-light-gray/5 last:border-b-0"
                    >
                      {a.photo_url ? (
                        <Image
                          src={a.photo_url}
                          alt={a.name}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple/20 to-blue/20">
                          <Music size={14} className="text-gray" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.name}</p>
                        <div className="flex items-center gap-2">
                          {a.genres.length > 0 && (
                            <p className="truncate text-xs text-light-gray">
                              {a.genres.slice(0, 2).join(" · ")}
                            </p>
                          )}
                          {a.followers > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray">
                              <Users size={10} />
                              {formatFollowers(a.followers)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={14} className="shrink-0 text-light-gray" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {!inputIsUrl &&
              input.trim().length >= 2 &&
              !searching &&
              spotifyResults.length === 0 &&
              existingResults.length === 0 && (
                <p className="py-6 text-center text-sm text-gray">
                  No artists found for &ldquo;{input}&rdquo;
                </p>
              )}

            {/* Hint text */}
            {!input && (
              <p className="mt-4 text-center text-xs text-light-gray/50">
                Supports Instagram, SoundCloud, Spotify, RA, TikTok, YouTube
              </p>
            )}
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && displayArtist && (
          <div>
            <button
              onClick={() => {
                setStep("input");
                setError("");
                setSelectedSpotify(null);
                setResolveData(null);
              }}
              className="mb-4 flex items-center gap-1 text-sm text-gray hover:text-[var(--text)] transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <div className="mb-6 flex flex-col items-center text-center">
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

              {displayArtist.genres && displayArtist.genres.length > 0 && (
                <p className="mt-1 text-xs text-gray">
                  {displayArtist.genres.slice(0, 3).join(" · ")}
                </p>
              )}

              {displayArtist.followers && displayArtist.followers > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-gray">
                  <Users size={12} />
                  {formatFollowers(displayArtist.followers)} followers
                </p>
              )}

              {displayArtist.platform && (
                <span className="mt-2 inline-block rounded-full border border-light-gray/20 px-3 py-0.5 text-xs text-gray">
                  via {PLATFORM_LABELS[displayArtist.platform] || displayArtist.platform}
                </span>
              )}

              {displayArtist.isExisting && (
                <span className="mt-2 inline-block rounded-full bg-teal/10 px-3 py-0.5 text-xs font-medium text-teal">
                  Already in Decibel
                </span>
              )}

              {socialLinks.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {socialLinks.map((link) => (
                    <SocialBadge key={link.label} label={link.label} url={link.url} />
                  ))}
                </div>
              )}
            </div>

            {/* Founder badge preview */}
            {!displayArtist.isExisting && (
              <div className="mb-4 rounded-xl border border-yellow/20 bg-yellow/5 px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-yellow">
                  <Crown size={16} />
                  You&apos;ll earn the Founder badge!
                </div>
                <p className="mt-1 text-xs text-yellow/70">
                  First person to add this artist — forever on their profile.
                </p>
              </div>
            )}

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
                  <Loader2 size={16} className="animate-spin" />
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
                <p className="mb-1 text-sm text-gray">added to your passport!</p>
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
                <p className="mb-6 text-sm text-gray">added to your passport!</p>
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
