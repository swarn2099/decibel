"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Play,
  Check,
  Compass,
  ChevronRight,
  Star,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { TIER_COLORS, TIER_LABELS, TIER_THRESHOLDS } from "@/lib/tiers";

interface JourneyData {
  authenticated: boolean;
  state: "none" | "discovered" | "collecting" | "devoted" | "inner_circle";
  scan_count: number;
  current_tier: string | null;
  next_tier: string | null;
  scans_to_next: number;
}

interface ArtistActionsProps {
  performerId: string;
  performerSlug: string;
  performerName: string;
  nextShowVenue: string | null;
  gradFrom: string;
  gradTo: string;
}

const JOURNEY_STEPS = [
  { key: "discover", label: "Discover" },
  { key: "collect", label: "Collect" },
  { key: "inner_circle", label: "Inner Circle" },
] as const;

function getActiveStep(
  state: JourneyData["state"]
): number {
  switch (state) {
    case "none":
      return -1;
    case "discovered":
      return 0;
    case "collecting":
      return 1;
    case "devoted":
      return 1;
    case "inner_circle":
      return 2;
    default:
      return -1;
  }
}

export function ArtistActions({
  performerId,
  performerSlug,
  performerName,
  nextShowVenue,
  gradFrom,
  gradTo,
}: ArtistActionsProps) {
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/artist/${performerSlug}/journey`)
      .then((res) => res.json())
      .then((data: JourneyData) => {
        setJourney(data);
        setLoading(false);
      })
      .catch(() => {
        setJourney({
          authenticated: false,
          state: "none",
          scan_count: 0,
          current_tier: null,
          next_tier: null,
          scans_to_next: 0,
        });
        setLoading(false);
      });
  }, [performerSlug]);

  async function handleDiscover() {
    setDiscovering(true);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performer_id: performerId }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.already_discovered) {
          toast.info(`${performerName} is already in your passport`);
        } else {
          toast.success(`Added ${performerName} to your passport!`);
        }
        setJourney((prev) =>
          prev
            ? { ...prev, state: "discovered", authenticated: true }
            : prev
        );
      } else {
        toast.error("Something went wrong. Try again.");
      }
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setDiscovering(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div
          className={`h-12 w-36 animate-pulse rounded-full bg-gradient-to-r ${gradFrom}/20 ${gradTo}/20`}
        />
        <div className="h-12 w-28 animate-pulse rounded-full bg-gray/10" />
      </div>
    );
  }

  const activeStep = getActiveStep(journey?.state ?? "none");
  const isAuthenticated = journey?.authenticated ?? false;

  return (
    <div className="space-y-4">
      {/* Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Not authenticated */}
        {!isAuthenticated && (
          <>
            <Link
              href={`/auth/login?redirect=/artist/${performerSlug}`}
              className="flex items-center gap-2 rounded-full border border-pink/40 px-6 py-3 text-sm font-bold text-pink transition-all hover:bg-pink/10 hover:scale-105"
            >
              <Compass className="h-4 w-4" />
              Discover
            </Link>
            {nextShowVenue && (
              <span className="text-xs text-gray">
                Next show at{" "}
                <span className="font-semibold text-[var(--text-muted)]">
                  {nextShowVenue}
                </span>
                {" "}&middot; scan QR to collect
              </span>
            )}
          </>
        )}

        {/* Authenticated, no relationship */}
        {isAuthenticated && journey?.state === "none" && (
          <>
            <button
              onClick={handleDiscover}
              disabled={discovering}
              className="flex items-center gap-2 rounded-full border border-pink/40 px-6 py-3 text-sm font-bold text-pink transition-all hover:bg-pink/10 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Compass className="h-4 w-4" />
              {discovering ? "Adding..." : "Discover"}
            </button>
            {nextShowVenue ? (
              <span className="text-xs text-gray">
                Next show at{" "}
                <span className="font-semibold text-[var(--text-muted)]">
                  {nextShowVenue}
                </span>
                {" "}&middot; scan QR to collect
              </span>
            ) : (
              <span className="text-xs text-gray">
                Scan QR at a show to collect in person
              </span>
            )}
          </>
        )}

        {/* Discovered */}
        {isAuthenticated && journey?.state === "discovered" && (
          <>
            <span className="flex items-center gap-2 rounded-full border border-teal/40 px-5 py-3 text-sm font-bold text-teal">
              <Check className="h-4 w-4" />
              Discovered
            </span>
            {nextShowVenue ? (
              <span className="text-xs text-gray">
                Scan QR at{" "}
                <span className="font-semibold text-[var(--text-muted)]">
                  {nextShowVenue}
                </span>
                {" "}to collect &amp; level up
              </span>
            ) : (
              <span className="text-xs text-gray">
                Scan QR at a show to collect &amp; level up
              </span>
            )}
          </>
        )}

        {/* Collecting or Devoted */}
        {isAuthenticated &&
          (journey?.state === "collecting" ||
            journey?.state === "devoted") && (
            <>
              {journey?.current_tier && (
                <span
                  className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold ${TIER_COLORS[journey.current_tier]?.bg} ${TIER_COLORS[journey.current_tier]?.text}`}
                >
                  <Star className="h-4 w-4" />
                  {TIER_LABELS[journey.current_tier]}
                </span>
              )}
              {/* Progress to next tier */}
              {journey?.next_tier && journey.scans_to_next > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray/20">
                    <div
                      className={`h-full rounded-full ${TIER_COLORS[journey.current_tier ?? "network"]?.text?.replace("text-", "bg-") ?? "bg-pink"} transition-all`}
                      style={{
                        width: `${Math.min(100, ((journey.scan_count / (TIER_THRESHOLDS[journey.next_tier] ?? 1)) * 100))}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray">
                    {journey.scans_to_next} scan
                    {journey.scans_to_next !== 1 ? "s" : ""} to{" "}
                    <span className={TIER_COLORS[journey.next_tier]?.text}>
                      {TIER_LABELS[journey.next_tier]}
                    </span>
                  </span>
                </div>
              )}
              {nextShowVenue && (
                <Link
                  href={`/collect/${performerSlug}`}
                  className="flex items-center gap-1 text-xs font-medium text-pink transition-colors hover:text-pink/80"
                >
                  See Next Show
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </>
          )}

        {/* Inner Circle */}
        {isAuthenticated && journey?.state === "inner_circle" && (
          <>
            <span className="flex items-center gap-2 rounded-full bg-gradient-to-r from-teal/20 to-yellow/20 border border-teal/30 px-5 py-3 text-sm font-bold text-teal">
              <Crown className="h-4 w-4 text-yellow" />
              Inner Circle
            </span>
            <span className="text-xs text-gray">
              {journey.scan_count} shows attended
            </span>
          </>
        )}
      </div>

      {/* Journey Stepper -- only show for authenticated users */}
      {isAuthenticated && journey?.state !== "none" && (
        <div className="flex items-center gap-0 pt-1">
          {JOURNEY_STEPS.map((step, idx) => {
            const isActive = idx <= activeStep;
            const isCurrent = idx === activeStep;
            return (
              <div key={step.key} className="flex items-center">
                {idx > 0 && (
                  <div
                    className={`h-px w-6 sm:w-10 transition-colors ${
                      idx <= activeStep ? "bg-pink" : "bg-gray/20"
                    }`}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                      isCurrent
                        ? "bg-pink text-[var(--text)] ring-2 ring-pink/30"
                        : isActive
                          ? "bg-pink/60 text-[var(--text)]"
                          : "bg-gray/15 text-gray"
                    }`}
                  >
                    {isActive ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      isCurrent
                        ? "text-pink"
                        : isActive
                          ? "text-[var(--text-muted)]"
                          : "text-gray/50"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
