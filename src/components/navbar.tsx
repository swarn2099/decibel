"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { User, LogIn, MapPin, Trophy } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { SearchBar } from "./search-bar";

const HIDDEN_ROUTES = ["/auth"];

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoaded(true);
    });
  }, []);

  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;
  if (!loaded) return null;

  const isLanding = pathname === "/";
  const showLogo = !isLanding;

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

      {/* Search bar — hidden on landing page (shown inline under hero instead) */}
      {!isLanding && <SearchBar className="mx-auto" />}

      <div className="flex shrink-0 items-center gap-2">
        {/* Leaderboard link */}
        <Link
          href="/leaderboard"
          className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm backdrop-blur-sm transition-colors ${
            pathname.startsWith("/leaderboard")
              ? "border-pink/50 bg-bg-card/80 text-pink"
              : "border-light-gray/20 bg-bg-card/80 text-gray hover:border-pink/30 hover:text-pink"
          }`}
        >
          <Trophy size={16} />
          <span className="hidden sm:inline">Leaderboard</span>
        </Link>

        {/* Map link */}
        <Link
          href="/map"
          className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm backdrop-blur-sm transition-colors ${
            pathname === "/map"
              ? "border-pink/50 bg-bg-card/80 text-pink"
              : "border-light-gray/20 bg-bg-card/80 text-gray hover:border-pink/30 hover:text-pink"
          }`}
        >
          <MapPin size={16} />
          <span className="hidden sm:inline">Map</span>
        </Link>

        {user ? (
          <Link
            href="/passport"
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm backdrop-blur-sm transition-colors ${
              pathname.startsWith("/passport")
                ? "border-pink/50 bg-bg-card/80 text-pink"
                : "border-light-gray/20 bg-bg-card/80 text-gray hover:border-pink/30 hover:text-pink"
            }`}
          >
            <User size={16} />
            <span className="hidden sm:inline">Passport</span>
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
      </div>
    </nav>
  );
}
