"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { User, LogIn, Search, X } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const HIDDEN_ROUTES = ["/auth"];

interface SearchResult {
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[] | null;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoaded(true);
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close dropdown on route change
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

  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;
  if (!loaded) return null;

  const showLogo = pathname !== "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 p-4">
      {showLogo ? (
        <Link href="/" className="w-20 shrink-0 text-xl font-bold">
          <span className="bg-gradient-to-r from-pink via-purple to-blue bg-clip-text text-transparent">
            DECIBEL
          </span>
        </Link>
      ) : (
        <div className="w-20 shrink-0" />
      )}

      {/* Center search with dropdown */}
      <div ref={wrapperRef} className="relative mx-auto w-full max-w-md">
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

        {/* Dropdown results */}
        {open && query.length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-light-gray/15 bg-bg-card shadow-2xl shadow-black/40 backdrop-blur-xl">
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

      {user ? (
        <Link
          href="/profile"
          className="flex shrink-0 items-center gap-2 rounded-full border border-light-gray/20 bg-bg-card/80 px-3 py-2 text-sm text-gray backdrop-blur-sm transition-colors hover:border-pink/30 hover:text-pink"
        >
          <User size={16} />
          <span className="hidden sm:inline">Profile</span>
        </Link>
      ) : (
        <Link
          href="/auth/login"
          className="flex shrink-0 items-center gap-2 rounded-full border border-light-gray/20 bg-bg-card/80 px-3 py-2 text-sm text-gray backdrop-blur-sm transition-colors hover:border-pink/30 hover:text-pink"
        >
          <LogIn size={16} />
          <span className="hidden sm:inline">Sign In</span>
        </Link>
      )}
    </nav>
  );
}
