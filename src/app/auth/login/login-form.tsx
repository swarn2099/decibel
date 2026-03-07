"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("rate") || error.message.toLowerCase().includes("limit")) {
        setCooldown(60);
      }
      setError(error.message);
    } else {
      setSent(true);
      setCooldown(60);
    }
    setLoading(false);
  }, [email, cooldown]);

  if (sent) {
    return (
      <div className="text-center">
        <div className="mb-4 text-4xl">✉️</div>
        <p className="text-sm text-gray">Magic link sent to</p>
        <p className="mt-1 font-semibold">{email}</p>
        <p className="mt-4 text-xs text-light-gray">Check your inbox and click the link to sign in.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your email"
        className="w-full rounded-xl border border-light-gray/30 bg-bg-card px-4 py-3 text-center text-sm outline-none transition-colors placeholder:text-light-gray focus:border-pink/50"
      />
      {error && <p className="text-center text-sm text-pink">{error}</p>}
      <button
        type="submit"
        disabled={loading || cooldown > 0}
        className="w-full rounded-xl bg-gradient-to-r from-pink to-purple px-6 py-3 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Send Magic Link"}
      </button>
    </form>
  );
}
