"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Calendar, Check } from "lucide-react";
import { toast } from "sonner";

interface RecommendedPerformer {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[];
  city: string | null;
  match_reason: string;
  next_show: { venue_name: string; event_date: string } | null;
}

interface RecommendationsData {
  recommendations: RecommendedPerformer[];
  based_on_genres: string[];
}

function formatShowDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function SkeletonCard() {
  return (
    <div className="w-[200px] shrink-0 animate-pulse rounded-xl border border-light-gray/10 bg-[#1a1a2e] p-4">
      <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-light-gray/10" />
      <div className="mx-auto mb-2 h-4 w-24 rounded bg-light-gray/10" />
      <div className="mx-auto mb-3 h-3 w-32 rounded bg-light-gray/5" />
      <div className="flex justify-center gap-1">
        <div className="h-5 w-14 rounded-full bg-light-gray/5" />
        <div className="h-5 w-14 rounded-full bg-light-gray/5" />
      </div>
    </div>
  );
}

function RecommendationCard({
  performer,
  onDiscover,
}: {
  performer: RecommendedPerformer;
  onDiscover: (id: string) => void;
}) {
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState(false);

  const initials = performer.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleDiscover() {
    setDiscovering(true);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performer_id: performer.id }),
      });
      const data = await res.json();
      if (data.success) {
        setDiscovered(true);
        toast.success(`Added ${performer.name} to your passport`);
        setTimeout(() => onDiscover(performer.id), 600);
      } else {
        toast.error("Failed to add artist");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDiscovering(false);
    }
  }

  return (
    <div
      className={`group relative w-[200px] shrink-0 snap-start rounded-xl border border-white/5 bg-[#1a1a2e] p-4 transition-all hover:border-pink/20 hover:shadow-[0_0_20px_rgba(255,77,106,0.08)] ${
        discovered ? "scale-95 opacity-0" : ""
      }`}
      style={{ transition: "opacity 0.4s, transform 0.4s" }}
    >
      {/* Live soon badge */}
      {performer.next_show && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-pink/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg">
          <Calendar size={10} className="mr-1 inline-block" />
          Live {formatShowDate(performer.next_show.event_date)}
        </div>
      )}

      {/* Artist photo / avatar */}
      <Link href={`/artist/${performer.slug}`} className="block">
        <div className="mx-auto mb-3 mt-1">
          {performer.photo_url ? (
            <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-full">
              <Image
                src={performer.photo_url}
                alt={performer.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          ) : (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple to-pink text-lg font-bold text-white">
              {initials}
            </div>
          )}
        </div>

        {/* Name */}
        <h4 className="mb-1 truncate text-center text-sm font-semibold text-[var(--text)] group-hover:text-pink transition-colors">
          {performer.name}
        </h4>
      </Link>

      {/* Match reason */}
      <p className="mb-2 text-center text-[10px] leading-tight text-gray">
        {performer.match_reason}
      </p>

      {/* Genre tags */}
      <div className="mb-3 flex flex-wrap justify-center gap-1">
        {performer.genres.slice(0, 2).map((genre) => (
          <span
            key={genre}
            className="rounded-full bg-purple/10 px-2 py-0.5 text-[10px] text-purple"
          >
            {genre}
          </span>
        ))}
      </div>

      {/* Next show venue */}
      {performer.next_show && (
        <p className="mb-2 text-center text-[10px] text-pink/80">
          @ {performer.next_show.venue_name}
        </p>
      )}

      {/* Discover button */}
      <button
        onClick={handleDiscover}
        disabled={discovering || discovered}
        className="mx-auto flex w-full items-center justify-center gap-1.5 rounded-full border border-pink/30 px-3 py-1.5 text-xs font-medium text-pink hover:bg-pink/10 transition-colors disabled:opacity-50"
      >
        {discovered ? (
          <>
            <Check size={12} /> Added
          </>
        ) : discovering ? (
          "Adding..."
        ) : (
          "Discover"
        )}
      </button>
    </div>
  );
}

export function Recommendations() {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/passport/recommendations")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d: RecommendationsData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Don't render section if error or empty
  if (error) return null;
  if (!loading && (!data || data.recommendations.length === 0)) {
    // Only show empty state if they have no collections at all
    return (
      <section className="mb-10">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-[var(--text)]">
          <Sparkles size={18} className="text-purple" />
          Artists You Might Like
        </h2>
        <p className="mb-4 text-xs text-gray">
          Collect more artists to unlock personalized recommendations
        </p>
      </section>
    );
  }

  function handleRemove(performerId: string) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        recommendations: prev.recommendations.filter(
          (r) => r.id !== performerId
        ),
      };
    });
  }

  return (
    <section className="mb-10">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-[var(--text)]">
        <Sparkles size={18} className="text-purple" />
        Artists You Might Like
      </h2>
      {data && data.based_on_genres.length > 0 && (
        <p className="mb-4 text-xs text-gray">
          Based on{" "}
          {data.based_on_genres
            .slice(0, 3)
            .map((g) => g)
            .join(", ")}
        </p>
      )}

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="-mx-4 px-4">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pt-3 pb-2 no-scrollbar">
            {data?.recommendations.map((performer) => (
              <RecommendationCard
                key={performer.id}
                performer={performer}
                onDiscover={handleRemove}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
