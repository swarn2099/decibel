"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, LogIn, Search, X } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const HIDDEN_ROUTES = ["/auth"];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const initialQ = pathname === "/" ? (searchParams.get("q") || "") : "";
  const [query, setQuery] = useState(initialQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isPushingRef = useRef(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoaded(true);
    });
  }, []);

  // Only sync from URL when user navigates (not when we push)
  useEffect(() => {
    if (isPushingRef.current) {
      isPushingRef.current = false;
      return;
    }
    if (pathname === "/") {
      setQuery(searchParams.get("q") || "");
    } else {
      setQuery("");
    }
  }, [pathname, searchParams]);

  function handleSearch(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      isPushingRef.current = true;
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      const qs = params.toString();
      if (pathname === "/") {
        router.replace(qs ? `/?${qs}` : "/", { scroll: false });
      } else {
        router.push(qs ? `/?${qs}` : "/");
      }
    }, 300);
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

      {/* Center search */}
      <div className="relative mx-auto w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-gray" />
        <input
          type="text"
          placeholder="Search artists or genres..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-full border border-light-gray/20 bg-bg-card/80 py-2 pl-10 pr-8 text-sm placeholder:text-light-gray backdrop-blur-sm outline-none transition-all focus:border-pink/40 focus:ring-1 focus:ring-pink/20"
        />
        {query && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-light-gray hover:text-pink"
          >
            <X size={14} />
          </button>
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
