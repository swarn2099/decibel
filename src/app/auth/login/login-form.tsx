"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
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
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

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
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-pink to-purple px-6 py-3 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Magic Link"}
      </button>
    </form>
  );
}
