"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";

const TIER_CONFIG = {
  network: { label: "Network", color: "text-pink", bg: "bg-pink/10", border: "border-pink/30", min: 1 },
  early_access: { label: "Early Access", color: "text-purple", bg: "bg-purple/10", border: "border-purple/30", min: 3 },
  secret: { label: "Secret Shows", color: "text-blue", bg: "bg-blue/10", border: "border-blue/30", min: 5 },
  inner_circle: { label: "Inner Circle", color: "text-teal", bg: "bg-teal/10", border: "border-teal/30", min: 10 },
} as const;

type Performer = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[];
  city: string;
};

type CollectResult = {
  scan_count: number;
  current_tier: string;
  already_collected: boolean;
};

export function CollectForm({ performer }: { performer: Performer }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CollectResult | null>(null);
  const [error, setError] = useState("");

  async function handleCollect(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performer_id: performer.id,
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        toast.error(data.error || "Something went wrong");
        return;
      }

      setResult(data);
      if (data.already_collected) {
        toast("Already in your collection", { icon: "👋" });
      } else {
        toast.success(`Collected ${performer.name}!`);
      }
    } catch {
      setError("Failed to connect. Try again.");
      toast.error("Failed to connect. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const tierKey = (result?.current_tier || "network") as keyof typeof TIER_CONFIG;
  const tier = TIER_CONFIG[tierKey];

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex w-full max-w-sm flex-col items-center gap-6"
      >
        {performer.photo_url && (
          <img
            src={performer.photo_url}
            alt={performer.name}
            className="h-24 w-24 rounded-full object-cover ring-2 ring-light-gray/30"
          />
        )}

        <div className="text-center">
          <p className="text-sm font-medium text-gray">
            {result.already_collected ? "Already collected" : "Collected"}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{performer.name}</h1>
        </div>

        <div className={`rounded-xl border ${tier.border} ${tier.bg} px-6 py-4 text-center`}>
          <p className="text-sm text-gray">Scans</p>
          <p className={`text-4xl font-bold ${tier.color}`}>{result.scan_count}</p>
          <p className={`mt-1 text-sm font-semibold ${tier.color}`}>{tier.label}</p>
        </div>

        {result.scan_count < 10 && (
          <p className="text-center text-sm text-light-gray">
            {result.scan_count < 3 && `${3 - result.scan_count} more scan${3 - result.scan_count === 1 ? "" : "s"} to unlock Early Access`}
            {result.scan_count >= 3 && result.scan_count < 5 && `${5 - result.scan_count} more scan${5 - result.scan_count === 1 ? "" : "s"} to unlock Secret Shows`}
            {result.scan_count >= 5 && result.scan_count < 10 && `${10 - result.scan_count} more scan${10 - result.scan_count === 1 ? "" : "s"} to unlock Inner Circle`}
          </p>
        )}

        <div className="mt-4 flex h-0.5 w-16 rounded-full bg-gradient-to-r from-pink to-purple" />
        <p className="text-xs text-light-gray">DECIBEL</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleCollect} className="flex w-full max-w-sm flex-col items-center gap-6">
      {performer.photo_url && (
        <img
          src={performer.photo_url}
          alt={performer.name}
          className="h-24 w-24 rounded-full object-cover ring-2 ring-light-gray/30"
        />
      )}

      <div className="text-center">
        <p className="text-sm font-medium text-gray">You were on the dancefloor</p>
        <h1 className="mt-1 text-3xl font-bold">{performer.name}</h1>
        {performer.genres.length > 0 && (
          <p className="mt-2 text-sm text-light-gray">{performer.genres.join(" · ")}</p>
        )}
      </div>

      <div className="w-full">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your email"
          className="w-full rounded-xl border border-light-gray/30 bg-bg-card px-4 py-3 text-center text-sm outline-none transition-colors placeholder:text-light-gray focus:border-pink/50"
        />
      </div>

      {error && <p className="text-sm text-pink">{error}</p>}

      <motion.button
        type="submit"
        disabled={loading}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="w-full rounded-xl bg-gradient-to-r from-pink to-purple px-6 py-3 font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? "Collecting..." : "Collect"}
      </motion.button>

      <div className="mt-2 flex h-0.5 w-16 rounded-full bg-gradient-to-r from-pink to-purple" />
      <p className="text-xs text-light-gray">DECIBEL</p>
    </form>
  );
}
