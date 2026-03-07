"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Loader2, CheckCircle } from "lucide-react";

interface ClaimBannerProps {
  performerId: string;
  performerName: string;
}

export function ClaimBanner({ performerId, performerName }: ClaimBannerProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/claim/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performer_id: performerId, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || "Something went wrong";
        setError(msg);
        toast.error(msg);
        return;
      }

      setSuccess(true);
      toast.success("Verification link sent! Check your email.");
    } catch {
      const msg = "Network error. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-teal/30 bg-teal/5 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 shrink-0 text-teal" />
          <div>
            <p className="font-semibold text-teal">Check your email!</p>
            <p className="text-sm text-[var(--text-muted)]">
              Click the link to verify and claim your profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-purple/20 bg-gradient-to-br from-purple/5 via-transparent to-pink/5">
      <div className="p-6">
        <h3 className="mb-1 text-lg font-bold">
          Are you {performerName}?
        </h3>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Claim this profile to access your fan analytics, send direct messages,
          and manage your shows.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
              className="w-full rounded-lg border border-light-gray/20 bg-bg px-4 py-3 pl-10 text-sm text-[var(--text)] placeholder-gray outline-none transition-colors focus:border-purple/50 focus:ring-1 focus:ring-purple/30 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple to-pink px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send Verification Link
              </>
            )}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
