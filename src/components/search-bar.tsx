"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

interface SearchResult {
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[] | null;
}

export function SearchBar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  function handleSearch(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const supabase = createSupabaseBrowser();
      const q = value.toLowerCase();
      const { data } = await supabase
        .from("performers")
        .select("name, slug, photo_url, genres")
        .or(`name.ilike.%${q}%,genres.cs.{${q}}`)
        .order("follower_count", { ascending: false })
        .limit(8);

      setResults(data || []);
      setOpen(true);
    }, 150);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className={`relative w-full max-w-md ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-gray" />
      <input
        type="text"
        placeholder="Search artists or genres..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        className="w-full rounded-full border border-light-gray/20 bg-bg-card/80 py-2 pl-10 pr-8 text-sm placeholder:text-light-gray backdrop-blur-sm outline-none transition-all focus:border-pink/40 focus:ring-1 focus:ring-pink/20"
      />
      {query && (
        <button
          onClick={clearSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-light-gray hover:text-pink"
        >
          <X size={14} />
        </button>
      )}

      {open && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-light-gray/15 bg-bg-card shadow-2xl shadow-black/40 backdrop-blur-xl z-50">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray">
              No artists match &ldquo;{query}&rdquo;
            </p>
          ) : (
            results.map((p) => (
              <Link
                key={p.slug}
                href={`/artist/${p.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-light-gray/10 first:rounded-t-xl last:rounded-b-xl"
              >
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-light-gray/20"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink/20 to-purple/20 text-sm font-bold text-gray">
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
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
