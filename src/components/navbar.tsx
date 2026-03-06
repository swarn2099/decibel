"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { User, LogIn } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const HIDDEN_ROUTES = ["/profile", "/settings", "/dashboard", "/auth"];
const HIDE_LOGO_ROUTES = ["/"];

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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4">
      {HIDE_LOGO_ROUTES.includes(pathname) ? (
        <div />
      ) : (
        <Link href="/" className="text-xl font-bold">
          <span className="bg-gradient-to-r from-pink via-purple to-blue bg-clip-text text-transparent">
            DECIBEL
          </span>
        </Link>
      )}
      {user ? (
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-full border border-light-gray/20 bg-bg-card/80 px-3 py-2 text-sm text-gray backdrop-blur-sm transition-colors hover:border-pink/30 hover:text-pink"
        >
          <User size={16} />
          <span className="hidden sm:inline">Profile</span>
        </Link>
      ) : (
        <Link
          href="/auth/login"
          className="flex items-center gap-2 rounded-full border border-light-gray/20 bg-bg-card/80 px-3 py-2 text-sm text-gray backdrop-blur-sm transition-colors hover:border-pink/30 hover:text-pink"
        >
          <LogIn size={16} />
          <span className="hidden sm:inline">Sign In</span>
        </Link>
      )}
    </nav>
  );
}
