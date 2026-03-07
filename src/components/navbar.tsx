"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { User, LogIn, MapPin, Trophy, Plus, Menu, X } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { SearchBar } from "./search-bar";

const HIDDEN_ROUTES = ["/auth"];

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoaded(true);
    });
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;
  if (!loaded) return null;

  const isLanding = pathname === "/";
  const showLogo = !isLanding;

  const navLinks = [
    { href: "/add", label: "Add Artist", icon: Plus, activeColor: "text-yellow", activeBorder: "border-yellow/50", hoverColor: "hover:text-yellow hover:border-yellow/30" },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy, activeColor: "text-pink", activeBorder: "border-pink/50", hoverColor: "hover:text-pink hover:border-pink/30", matchPrefix: true },
    { href: "/map", label: "Map", icon: MapPin, activeColor: "text-pink", activeBorder: "border-pink/50", hoverColor: "hover:text-pink hover:border-pink/30" },
  ];

  const isActive = (href: string, matchPrefix?: boolean) =>
    matchPrefix ? pathname.startsWith(href) : pathname === href;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-bg/80 backdrop-blur-md p-3 sm:p-4">
        {showLogo ? (
          <Link href="/" className="shrink-0 text-xl font-bold">
            <span className="bg-gradient-to-r from-pink via-purple to-blue bg-clip-text text-transparent">
              DECIBEL
            </span>
          </Link>
        ) : (
          <div className="w-16 shrink-0" />
        )}

        {/* Search bar — hidden on landing & mobile */}
        {!isLanding && <SearchBar className="mx-auto hidden sm:block" />}

        {/* Desktop nav */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm backdrop-blur-sm transition-colors ${
                isActive(link.href, link.matchPrefix)
                  ? `${link.activeBorder} bg-bg-card/80 ${link.activeColor}`
                  : `border-light-gray/20 bg-bg-card/80 text-gray ${link.hoverColor}`
              }`}
            >
              <link.icon size={16} />
              <span>{link.label}</span>
            </Link>
          ))}

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
              <span>Passport</span>
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="flex shrink-0 items-center gap-2 rounded-full border border-light-gray/20 bg-bg-card/80 px-3 py-2 text-sm text-gray backdrop-blur-sm transition-colors hover:border-pink/30 hover:text-pink"
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex sm:hidden shrink-0 items-center justify-center rounded-full border border-light-gray/20 bg-bg-card/80 p-2 text-gray backdrop-blur-sm transition-colors hover:text-pink"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-bg/95 backdrop-blur-sm pt-16 sm:hidden">
          <div className="flex flex-col gap-2 p-4">
            {/* Mobile search */}
            {!isLanding && <SearchBar className="mb-4" />}

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  isActive(link.href, link.matchPrefix)
                    ? `${link.activeBorder} bg-bg-card ${link.activeColor}`
                    : "border-light-gray/10 bg-bg-card text-gray hover:border-light-gray/30"
                }`}
              >
                <link.icon size={18} />
                {link.label}
              </Link>
            ))}

            {user ? (
              <Link
                href="/passport"
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  pathname.startsWith("/passport")
                    ? "border-pink/50 bg-bg-card text-pink"
                    : "border-light-gray/10 bg-bg-card text-gray hover:border-light-gray/30"
                }`}
              >
                <User size={18} />
                Passport
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="flex items-center gap-3 rounded-xl border border-light-gray/10 bg-bg-card px-4 py-3 text-sm font-medium text-gray transition-colors hover:border-light-gray/30"
              >
                <LogIn size={18} />
                Sign In
              </Link>
            )}

            {user && (
              <Link
                href="/settings"
                className="flex items-center gap-3 rounded-xl border border-light-gray/10 bg-bg-card px-4 py-3 text-sm font-medium text-gray transition-colors hover:border-light-gray/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                Settings
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
