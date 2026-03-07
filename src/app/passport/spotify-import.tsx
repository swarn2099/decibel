"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2, Music, ExternalLink, RefreshCw } from "lucide-react";

interface ImportedArtist {
  name: string;
  performer_id: string;
  photo_url: string | null;
  already_discovered: boolean;
  has_upcoming_show: boolean;
  next_show?: { venue_name: string; event_date: string };
}

interface ImportResults {
  imported: number;
  already_had: number;
  artists: ImportedArtist[];
}

interface SpotifyImportProps {
  onImportComplete: () => void;
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function AppleMusicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M23.997 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0019.7.157 10.56 10.56 0 0017.961.001H6.039A10.56 10.56 0 004.3.157 5.022 5.022 0 002.423.891C1.305 1.624.56 2.624.243 3.934A9.23 9.23 0 00.003 6.124v11.752a9.23 9.23 0 00.24 2.19c.317 1.31 1.062 2.31 2.18 3.043a5.022 5.022 0 001.877.734c.58.1 1.165.148 1.752.157h11.922c.587-.009 1.172-.057 1.752-.157a5.022 5.022 0 001.877-.734c1.118-.733 1.863-1.733 2.18-3.043a9.23 9.23 0 00.24-2.19V6.124zM16.94 14.544c0 1.612-.568 2.705-1.453 3.38-.867.662-2.023.99-3.299.99-.192 0-.39-.009-.585-.028v.001h-.005a.448.448 0 01-.411-.443V8.863a.449.449 0 01.334-.434l4.004-1.065a.449.449 0 01.564.434v.543c0 .007-.001.014-.001.021v5.13c.552-.3.95-.342 1.259-.342.86 0 1.293.535 1.293 1.15v.244h-.001zm-4.25-7.608v9.508c.157.013.316.02.479.02.974 0 1.827-.235 2.4-.672.586-.447.92-1.128.92-2.248v-.244c0-.185-.112-.35-.193-.35-.127 0-.397.133-1.06.496a.449.449 0 01-.649-.402V7.503L16.04 7v-.543c0-.004 0-.007.001-.011L12.69 7.436v-.5z" />
    </svg>
  );
}

export function SpotifyImport({ onImportComplete }: SpotifyImportProps) {
  const searchParams = useSearchParams();
  const [importStatus, setImportStatus] = useState<
    "idle" | "importing" | "done" | "error"
  >("idle");
  const [importResults, setImportResults] = useState<ImportResults | null>(
    null
  );
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  useEffect(() => {
    if (searchParams.get("spotify") === "connected" && !spotifyConnected) {
      setSpotifyConnected(true);
      triggerImport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function triggerImport() {
    setImportStatus("importing");
    try {
      const res = await fetch("/api/spotify/import", { method: "POST" });
      if (!res.ok) {
        throw new Error("Import failed");
      }
      const data: ImportResults = await res.json();
      setImportResults(data);
      setImportStatus("done");
      onImportComplete();
    } catch {
      setImportStatus("error");
    }
  }

  function formatShowDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {/* Spotify Section */}
      <div className="rounded-xl border border-white/10 bg-bg-card p-5">
        {importStatus === "idle" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SpotifyIcon className="h-8 w-8 text-[#1DB954]" />
              <div>
                <h3 className="font-semibold text-[var(--text)]">
                  Connect Spotify
                </h3>
                <p className="text-sm text-gray">
                  Import your top artists as discoveries
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                window.location.href = "/api/spotify/auth";
              }}
              className="rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-[#1ed760] hover:scale-105"
            >
              Connect
            </button>
          </div>
        )}

        {importStatus === "importing" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#1DB954]" />
            <p className="text-sm font-medium text-[var(--text)]">
              Importing your top artists...
            </p>
            <p className="text-xs text-gray">
              Matching with performers in our database
            </p>
          </div>
        )}

        {importStatus === "done" && importResults && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <SpotifyIcon className="h-6 w-6 text-[#1DB954]" />
              <div>
                <h3 className="font-semibold text-[var(--text)]">
                  Imported {importResults.imported} artist
                  {importResults.imported !== 1 ? "s" : ""} to your passport
                </h3>
                {importResults.already_had > 0 && (
                  <p className="text-xs text-gray">
                    {importResults.already_had} already in your collection
                  </p>
                )}
              </div>
            </div>

            {/* Artist grid */}
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {importResults.artists.map((artist) => (
                <div
                  key={artist.performer_id}
                  className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5"
                >
                  {artist.photo_url ? (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={artist.photo_url}
                        alt={artist.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple text-sm font-bold text-white">
                      {artist.name[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text)]">
                      {artist.name}
                    </p>
                    {artist.already_discovered && (
                      <p className="text-xs text-gray">Already collected</p>
                    )}
                  </div>
                  {artist.has_upcoming_show && artist.next_show && (
                    <div className="flex shrink-0 items-center gap-1 rounded-full bg-pink/15 px-2.5 py-1 text-xs font-medium text-pink">
                      <ExternalLink size={10} />
                      <span>
                        Live {formatShowDate(artist.next_show.event_date)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {importStatus === "error" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SpotifyIcon className="h-8 w-8 text-[#1DB954] opacity-50" />
              <div>
                <h3 className="font-semibold text-[var(--text)]">
                  Import failed
                </h3>
                <p className="text-sm text-gray">
                  Something went wrong. Try again.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                window.location.href = "/api/spotify/auth";
              }}
              className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-white/5"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Apple Music Section */}
      <div className="rounded-xl border border-white/10 bg-bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FA233B] to-[#FB5C74]">
              <Music size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text)]">
                Connect Apple Music
              </h3>
              <p className="text-sm text-gray">
                Coming soon — connect in the mobile app
              </p>
            </div>
          </div>
          <button
            disabled
            className="cursor-not-allowed rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-gray opacity-50"
          >
            Soon
          </button>
        </div>
      </div>
    </div>
  );
}
