"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

interface Performer {
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[] | null;
  follower_count: number | null;
}

export function PerformerGrid({ performers }: { performers: Performer[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.length < 2
    ? performers
    : performers.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.genres?.some((g) => g.toLowerCase().includes(query.toLowerCase()))
      );

  return (
    <>
      {/* Search */}
      <div className="mx-auto mb-8 max-w-md">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-light-gray" />
          <input
            type="text"
            placeholder="Search artists or genres..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-light-gray/20 bg-bg-card py-3 pl-11 pr-4 text-sm placeholder:text-light-gray outline-none transition-all focus:border-pink/40 focus:ring-1 focus:ring-pink/20"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-light-gray hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
        {query.length >= 2 && (
          <p className="mt-2 text-center text-xs text-light-gray">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtered.map((p) => (
          <Link
            key={p.slug}
            href={`/artist/${p.slug}`}
            className="group flex flex-col items-center rounded-xl border border-light-gray/10 bg-bg-card p-5 transition-all hover:border-pink/30 hover:scale-[1.02]"
          >
            {p.photo_url ? (
              <img
                src={p.photo_url}
                alt={p.name}
                className="mb-3 h-20 w-20 rounded-full object-cover ring-2 ring-light-gray/20 group-hover:ring-pink/40 transition-all"
              />
            ) : (
              <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink/20 to-purple/20 text-2xl font-bold text-gray group-hover:from-pink/30 group-hover:to-purple/30 transition-all">
                {p.name[0]}
              </div>
            )}
            <p className="text-sm font-semibold text-center leading-tight">
              {p.name}
            </p>
            {p.genres && p.genres.length > 0 && (
              <p className="mt-1 text-center text-[11px] text-light-gray leading-tight">
                {p.genres.slice(0, 2).join(" · ")}
              </p>
            )}
          </Link>
        ))}
      </div>

      {filtered.length === 0 && query.length >= 2 && (
        <p className="mt-8 text-center text-sm text-gray">
          No artists match &ldquo;{query}&rdquo;
        </p>
      )}
    </>
  );
}
