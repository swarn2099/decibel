"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Disc3,
  Compass,
  Award,
  Search,
  UserPlus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { ActivityFeedItem, ContactCheckResult } from "@/lib/types/social";

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray",
  rare: "text-blue",
  epic: "text-purple",
  legendary: "text-yellow",
};

function ActivityItem({ item }: { item: ActivityFeedItem }) {
  const fanInitials = item.fan.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (item.type === "badge" && item.badge) {
    const rarityColor = RARITY_COLORS[item.badge.rarity] || "text-gray";
    return (
      <div className="flex items-start gap-3 rounded-xl border border-light-gray/10 bg-bg-card p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple/20 to-pink/20 text-sm font-bold text-[var(--text)]">
          {fanInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--text)]">
            <Link
              href={`/passport/${item.fan.slug}`}
              className="font-semibold hover:text-pink transition-colors"
            >
              {item.fan.name}
            </Link>{" "}
            earned{" "}
            <span className={rarityColor}>
              {item.badge.icon} {item.badge.name}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-light-gray">
            {relativeTime(item.created_at)}
          </p>
        </div>
      </div>
    );
  }

  // Collection or discovery
  const verb = item.type === "collection" ? "collected" : "discovered";
  const Icon = item.type === "collection" ? Disc3 : Compass;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-light-gray/10 bg-bg-card p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink/20 to-purple/20 text-sm font-bold text-[var(--text)]">
        {fanInitials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--text)]">
          <Link
            href={`/passport/${item.fan.slug}`}
            className="font-semibold hover:text-pink transition-colors"
          >
            {item.fan.name}
          </Link>{" "}
          {verb}{" "}
          {item.performer && (
            <Link
              href={`/artist/${item.performer.slug}`}
              className="font-semibold text-pink hover:underline"
            >
              {item.performer.name}
            </Link>
          )}
          {item.venue && (
            <span className="text-gray"> at {item.venue.name}</span>
          )}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-light-gray">
          <Icon size={12} />
          <span>{relativeTime(item.created_at)}</span>
        </div>
      </div>
      {item.performer?.photo_url && (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
          <Image
            src={item.performer.photo_url}
            alt={item.performer.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
      )}
    </div>
  );
}

function ContactCheck() {
  const [showInput, setShowInput] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ContactCheckResult[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  async function handleCheck() {
    const emails = emailText
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      toast.error("Enter at least one email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/social/contact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      if (!res.ok) throw new Error("Failed to check contacts");
      const data = await res.json();
      setResults(data.matches || []);
      setFollowingIds(
        new Set(
          (data.matches || [])
            .filter((m: ContactCheckResult) => m.isFollowing)
            .map((m: ContactCheckResult) => m.fan?.id)
            .filter(Boolean)
        )
      );

      // Store in localStorage for contact-notify
      localStorage.setItem(
        "decibel_checked_contacts",
        JSON.stringify(emails)
      );
      localStorage.setItem(
        "decibel_contacts_last_checked",
        new Date().toISOString()
      );

      if ((data.matches || []).length === 0) {
        toast("No matches found");
      }
    } catch {
      toast.error("Failed to check contacts");
    } finally {
      setLoading(false);
    }
  }

  async function handleFollow(fanId: string) {
    try {
      const res = await fetch("/api/social/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetFanId: fanId, action: "follow" }),
      });
      if (!res.ok) throw new Error("Failed to follow");
      setFollowingIds((prev) => new Set([...prev, fanId]));
      toast.success("Followed!");
    } catch {
      toast.error("Failed to follow");
    }
  }

  if (!showInput && results.length === 0) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-light-gray/20 p-3 text-sm text-gray hover:border-pink/30 hover:text-pink transition-colors"
      >
        <Search size={16} />
        Find friends on Decibel
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {showInput && results.length === 0 && (
        <div className="space-y-2">
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder="Paste emails (comma or newline separated)"
            rows={3}
            className="w-full rounded-xl border border-light-gray/10 bg-bg-card p-3 text-sm text-[var(--text)] placeholder:text-light-gray/50 focus:border-pink/30 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCheck}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-pink px-4 py-2 text-sm font-medium text-white hover:bg-pink/80 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              {loading ? "Checking..." : "Check"}
            </button>
            <button
              onClick={() => setShowInput(false)}
              className="rounded-lg px-4 py-2 text-sm text-gray hover:text-[var(--text)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray">
            {results.length} contact{results.length !== 1 ? "s" : ""} found on
            Decibel
          </p>
          {results.map((r) =>
            r.fan ? (
              <div
                key={r.fan.id}
                className="flex items-center justify-between rounded-xl border border-light-gray/10 bg-bg-card p-3"
              >
                <Link
                  href={`/passport/${r.fan.slug}`}
                  className="text-sm font-medium text-[var(--text)] hover:text-pink transition-colors"
                >
                  {r.fan.name}
                </Link>
                {followingIds.has(r.fan.id) ? (
                  <span className="text-xs text-gray">Following</span>
                ) : (
                  <button
                    onClick={() => handleFollow(r.fan!.id)}
                    className="flex items-center gap-1 rounded-full border border-pink/30 px-3 py-1 text-xs font-medium text-pink hover:bg-pink/10 transition-colors"
                  >
                    <UserPlus size={12} />
                    Follow
                  </button>
                )}
              </div>
            ) : null
          )}
          <button
            onClick={() => {
              setResults([]);
              setShowInput(true);
              setEmailText("");
            }}
            className="text-xs text-gray hover:text-[var(--text)] transition-colors"
          >
            Check more emails
          </button>
        </div>
      )}
    </div>
  );
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const url = cursor
        ? `/api/social/feed?cursor=${encodeURIComponent(cursor)}`
        : "/api/social/feed";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (cursor) {
        setItems((prev) => [...prev, ...(data.items || [])]);
      } else {
        setItems(data.items || []);
      }
      setHasMore(data.hasMore || false);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchFeed().finally(() => setLoading(false));
  }, [fetchFeed]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const lastItem = items[items.length - 1];
          if (lastItem) {
            setLoadingMore(true);
            fetchFeed(lastItem.created_at).finally(() =>
              setLoadingMore(false)
            );
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, items, fetchFeed]);

  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--text)]">
        <Users size={20} className="text-purple" />
        Friend Activity
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-light-gray/10 bg-bg-card"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-light-gray/10 bg-bg-card p-6 text-center">
            <Users
              size={32}
              className="mx-auto mb-3 text-light-gray/40"
            />
            <p className="text-sm text-gray">
              Follow other fans to see their activity here
            </p>
          </div>
          <ContactCheck />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ActivityItem key={item.id} item={item} />
          ))}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-2">
              {loadingMore && (
                <Loader2
                  size={20}
                  className="animate-spin text-light-gray"
                />
              )}
            </div>
          )}
          <ContactCheck />
        </div>
      )}
    </section>
  );
}
