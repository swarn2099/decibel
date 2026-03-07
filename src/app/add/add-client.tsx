"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  X,
  Loader2,
  Music,
  Crown,
  Sparkles,
  ArrowRight,
  Users,
  Check,
} from "lucide-react";

interface SpotifyResult {
  id: string;
  name: string;
  photo_url: string | null;
  genres: string[];
  spotify_url: string;
  followers: number;
  monthly_listeners: number | null;
}

interface ExistingPerformer {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[] | null;
  follower_count: number | null;
}

type Step = "search" | "confirm" | "loading" | "success" | "already-exists";

export function AddArtistClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState(initialQuery);
  const [spotifyResults, setSpotifyResults] = useState<SpotifyResult[]>([]);
  const [existingResults, setExistingResults] = useState<ExistingPerformer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SpotifyResult | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    performer: { id: string; name: string; slug: string };
    is_founder: boolean;
  } | null>(null);
  const [existingFounder, setExistingFounder] = useState<string | null>(null);
  const [existingPerformer, setExistingPerformer] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialQuery) {
      handleSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    setError("");
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
      } catch {
        setError("Search failed. Try again.");
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function selectArtist(artist: SpotifyResult) {
    setSelected(artist);
    setStep("confirm");
  }

  async function handleAdd() {
    if (!selected) return;
    setStep("loading");
    setError("");

    try {
      const res = await fetch("/api/add-artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotify_id: selected.id }),
      });

      if (res.status === 401) {
        router.push("/auth/login?redirect=/add");
        return;
      }

      const data = await res.json();

      if (data.already_exists) {
        setExistingPerformer(data.performer);
        setExistingFounder(data.founder?.name || null);
        setStep("already-exists");
        return;
      }

      if (!data.success) {
        setError(data.error || "Failed to add artist");
        setStep("confirm");
        return;
      }

      setResult(data);
      setStep("success");
    } catch {
      setError("Something went wrong. Try again.");
      setStep("confirm");
    }
  }

  function formatFollowers(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  const isMainstream = selected && selected.followers >= 1_000_000;

  return (
    <div className="min-h-dvh bg-bg px-4 pb-20 pt-20">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow/20 bg-yellow/5 px-4 py-1.5 text-xs font-semibold text-yellow">
            <Crown size={14} />
            Founder Badge
          </div>
          <h1 className="mb-2 text-3xl font-bold">Add an Artist</h1>
          <p className="text-sm text-gray">
            Be the first to add an artist and earn their Founder badge forever.
          </p>
        </div>

        {/* Step: Search */}
        {step === "search" && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-light-gray" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for an artist..."
                className="w-full rounded-xl border border-light-gray/20 bg-bg-card py-3 pl-11 pr-10 text-sm placeholder:text-light-gray/50 outline-none transition-all focus:border-pink/40 focus:ring-1 focus:ring-pink/20"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    setSpotifyResults([]);
                    setExistingResults([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-light-gray hover:text-pink"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {searching && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray">
                <Loader2 size={16} className="animate-spin" />
                Searching...
              </div>
            )}

            {error && <p className="mb-4 text-center text-sm text-red-400">{error}</p>}

            {/* Existing Decibel artists */}
            {existingResults.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal">
                  Already on Decibel
                </h3>
                <div className="rounded-xl border border-light-gray/10 bg-bg-card overflow-hidden">
                  {existingResults.map((p) => (
                    <Link
                      key={p.id}
                      href={`/artist/${p.slug}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-light-gray/5 border-b border-light-gray/5 last:border-b-0"
                    >
                      {p.photo_url ? (
                        <Image
                          src={p.photo_url}
                          alt={p.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink/20 to-purple/20 text-sm font-bold text-gray">
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
                      <span className="text-xs text-teal">
                        <Check size={14} />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Spotify results */}
            {spotifyResults.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-pink">
                  Add from Spotify
                </h3>
                <div className="rounded-xl border border-light-gray/10 bg-bg-card overflow-hidden">
                  {spotifyResults.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => selectArtist(a)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-light-gray/5 border-b border-light-gray/5 last:border-b-0"
                    >
                      {a.photo_url ? (
                        <Image
                          src={a.photo_url}
                          alt={a.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple/20 to-blue/20">
                          <Music size={16} className="text-gray" />
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
            {query.length >= 2 &&
              !searching &&
              spotifyResults.length === 0 &&
              existingResults.length === 0 && (
                <p className="py-8 text-center text-sm text-gray">
                  No artists found for &ldquo;{query}&rdquo;
                </p>
              )}
          </>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && selected && (
          <div className="rounded-2xl border border-light-gray/10 bg-bg-card p-6">
            <button
              onClick={() => {
                setStep("search");
                setError("");
              }}
              className="mb-4 text-sm text-gray hover:text-[var(--text)] transition-colors"
            >
              &larr; Back to search
            </button>

            <div className="mb-6 flex flex-col items-center text-center">
              {selected.photo_url ? (
                <div className="relative mb-4 h-28 w-28 overflow-hidden rounded-full ring-2 ring-pink/30">
                  <Image
                    src={selected.photo_url}
                    alt={selected.name}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                </div>
              ) : (
                <div className="mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple ring-2 ring-pink/30">
                  <Music size={40} className="text-white" />
                </div>
              )}

              <h2 className="text-xl font-bold">{selected.name}</h2>

              {selected.genres.length > 0 && (
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {selected.genres.slice(0, 4).map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-gray/15 px-2.5 py-0.5 text-[11px] text-gray"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {selected.followers > 0 && (
                <p className="mt-2 flex items-center gap-1 text-sm text-gray">
                  <Users size={14} />
                  {formatFollowers(selected.followers)} followers
                </p>
              )}
            </div>

            {/* Mainstream warning or founder badge preview */}
            {isMainstream ? (
              <div className="mb-4 rounded-xl border border-yellow/20 bg-yellow/5 px-4 py-3 text-center text-sm text-yellow">
                Too mainstream for a Founder badge — but you can still add them!
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-yellow/20 bg-yellow/5 px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-yellow">
                  <Crown size={16} />
                  You&apos;ll earn the Founder badge!
                </div>
                <p className="mt-1 text-xs text-yellow/70">
                  First person to add this artist to Decibel — forever on their profile.
                </p>
              </div>
            )}

            {error && (
              <p className="mb-4 text-center text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleAdd}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink py-3 text-sm font-semibold text-white transition-all hover:bg-pink/90"
            >
              Add to Decibel
            </button>
          </div>
        )}

        {/* Step: Loading */}
        {step === "loading" && selected && (
          <div className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="relative">
              {selected.photo_url ? (
                <div className="relative h-28 w-28 overflow-hidden rounded-full ring-2 ring-pink/30 animate-pulse">
                  <Image
                    src={selected.photo_url}
                    alt={selected.name}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                </div>
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple ring-2 ring-pink/30 animate-pulse">
                  <Music size={40} className="text-white" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 rounded-full bg-bg p-1">
                <Loader2 size={20} className="animate-spin text-pink" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold">Building profile...</h2>
              <p className="mt-1 text-sm text-gray">
                Creating {selected.name}&apos;s page on Decibel
              </p>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && result && (
          <div className="flex flex-col items-center gap-6 py-8 text-center">
            {result.is_founder && (
              <div className="relative">
                <Sparkles
                  size={64}
                  className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow animate-pulse"
                />
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow/10 ring-2 ring-yellow/30">
                  <Crown size={36} className="text-yellow" />
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold">
                {result.is_founder
                  ? `You're the Founder!`
                  : `${result.performer.name} added!`}
              </h2>
              {result.is_founder && (
                <p className="mt-1 text-sm text-yellow">
                  Founder of {result.performer.name} on Decibel
                </p>
              )}
              <p className="mt-2 text-sm text-gray">
                Added to your passport as discovered
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <Link
                href={`/artist/${result.performer.slug}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink py-3 text-sm font-semibold text-white transition-all hover:bg-pink/90"
              >
                View Artist Page
                <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => {
                  setStep("search");
                  setQuery("");
                  setSpotifyResults([]);
                  setExistingResults([]);
                  setSelected(null);
                  setResult(null);
                  setError("");
                }}
                className="rounded-xl border border-light-gray/20 py-3 text-sm font-medium text-gray transition-colors hover:border-pink/30 hover:text-pink"
              >
                Add Another Artist
              </button>
            </div>
          </div>
        )}

        {/* Step: Already exists */}
        {step === "already-exists" && existingPerformer && (
          <div className="flex flex-col items-center gap-6 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
              <Check size={32} className="text-teal" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Already on Decibel</h2>
              {existingFounder && (
                <p className="mt-1 text-sm text-yellow">
                  <Crown size={14} className="mr-1 inline" />
                  Founded by {existingFounder}
                </p>
              )}
            </div>
            <Link
              href={`/artist/${existingPerformer.slug}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink py-3 text-sm font-semibold text-white transition-all hover:bg-pink/90"
            >
              View Profile
              <ArrowRight size={16} />
            </Link>
            <button
              onClick={() => {
                setStep("search");
                setQuery("");
                setSelected(null);
                setExistingPerformer(null);
                setExistingFounder(null);
                setError("");
              }}
              className="text-sm text-gray hover:text-pink transition-colors"
            >
              Search for another artist
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
