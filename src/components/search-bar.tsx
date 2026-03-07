"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, X, User } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { generateFanSlug } from "@/lib/fan-slug";

interface SearchResult {
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[] | null;
}

interface FanResult {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
}

export function SearchBar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [fanResults, setFanResults] = useState<FanResult[]>([]);
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
      setFanResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const supabase = createSupabaseBrowser();
      const q = value.toLowerCase();
      const [{ data: performers }, { data: fans }] = await Promise.all([
        supabase
          .from("performers")
          .select("name, slug, photo_url, genres")
          .or(`name.ilike.%${q}%,genres.cs.{${q}}`)
          .order("follower_count", { ascending: false })
          .limit(8),
        supabase
          .from("fans")
          .select("id, name, email, avatar_url")
          .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(5),
      ]);

      setResults(performers || []);
      setFanResults(
        (fans || [])
          .filter((f) => f.name || f.email)
          .map((f) => ({
            id: f.id,
            name: f.name || f.email!,
            slug: generateFanSlug({ name: f.name, id: f.id }),
            avatar_url: f.avatar_url,
          }))
      );
      setOpen(true);
    }, 150);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setFanResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className={`relative w-full max-w-md ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-gray" />
      <input
        type="text"
        placeholder="Search artists, genres, or users..."
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
          {results.length === 0 && fanResults.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray">
                No results for &ldquo;{query}&rdquo;
              </p>
              <Link
                href={`/add?q=${encodeURIComponent(query)}`}
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-pink hover:text-pink/80 transition-colors"
              >
                Add an artist to Decibel &rarr;
              </Link>
            </div>
          ) : (
            <>
              {/* Artist results */}
              {results.map((p) => (
                <Link
                  key={p.slug}
                  href={`/artist/${p.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-light-gray/10 first:rounded-t-xl"
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
              ))}

              {/* Fan results */}
              {fanResults.length > 0 && (
                <>
                  {results.length > 0 && (
                    <div className="border-t border-light-gray/10 px-4 py-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-light-gray">Decibel Users</p>
                    </div>
                  )}
                  {fanResults.map((f) => (
                    <Link
                      key={f.id}
                      href={`/passport/${f.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-light-gray/10"
                    >
                      {f.avatar_url ? (
                        <img
                          src={f.avatar_url}
                          alt={f.name}
                          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-light-gray/20"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal/20 to-blue/20 text-gray">
                          <User size={16} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{f.name}</p>
                        <p className="text-xs text-light-gray">Decibel User</p>
                      </div>
                    </Link>
                  ))}
                </>
              )}

              <Link
                href={`/add?q=${encodeURIComponent(query)}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 border-t border-light-gray/10 px-4 py-3 text-sm font-medium text-pink hover:bg-light-gray/5 rounded-b-xl transition-colors"
              >
                Not here? Add them to Decibel &rarr;
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
