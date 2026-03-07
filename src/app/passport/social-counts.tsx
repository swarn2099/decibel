"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, UserCheck, UserX } from "lucide-react";
import type { SocialCounts as SocialCountsType, FollowStatus, FollowResponse } from "@/lib/types/social";

interface SocialCountsProps {
  fanId: string;
  isOwner: boolean;
  currentUserId?: string;
}

export function SocialCounts({ fanId, isOwner, currentUserId }: SocialCountsProps) {
  const [counts, setCounts] = useState<SocialCountsType>({ followers: 0, following: 0 });
  const [followStatus, setFollowStatus] = useState<FollowStatus>("not_following");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [followersRes, followingRes] = await Promise.all([
          fetch(`/api/social/followers?fanId=${fanId}&countOnly=true`),
          fetch(`/api/social/following?fanId=${fanId}&countOnly=true`),
        ]);

        const [followersData, followingData] = await Promise.all([
          followersRes.json(),
          followingRes.json(),
        ]);

        setCounts({
          followers: followersData.count ?? 0,
          following: followingData.count ?? 0,
        });
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, [fanId]);

  // Check if current user follows this fan
  useEffect(() => {
    if (isOwner || !currentUserId) return;

    async function checkFollowStatus() {
      try {
        const res = await fetch(`/api/social/followers?fanId=${fanId}`);
        const data = await res.json();
        const isFollowing = (data.followers || []).some(
          (f: { follower_id: string }) => f.follower_id === currentUserId
        );
        setFollowStatus(isFollowing ? "following" : "not_following");
      } catch {
        // Silent fail
      }
    }

    checkFollowStatus();
  }, [fanId, currentUserId, isOwner]);

  async function handleFollowToggle() {
    if (!currentUserId) return;

    const newAction = followStatus === "not_following" ? "follow" : "unfollow";
    const prevStatus = followStatus;
    const prevCounts = { ...counts };

    // Optimistic update
    if (newAction === "follow") {
      setFollowStatus("following");
      setCounts((c) => ({ ...c, followers: c.followers + 1 }));
    } else {
      setFollowStatus("not_following");
      setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/social/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetFanId: fanId, action: newAction }),
      });

      if (!res.ok) throw new Error("Failed");

      const data: FollowResponse = await res.json();
      setFollowStatus(data.status);
      setCounts(data.counts);
    } catch {
      // Revert on error
      setFollowStatus(prevStatus);
      setCounts(prevCounts);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-3 flex items-center justify-center gap-4 text-sm">
        <span className="h-4 w-20 animate-pulse rounded bg-light-gray/10" />
        <span className="h-4 w-20 animate-pulse rounded bg-light-gray/10" />
      </div>
    );
  }

  const isFollowing = followStatus === "following" || followStatus === "mutual";

  return (
    <div className="mt-3 flex items-center justify-center gap-4 text-sm">
      <span className="flex items-center gap-1.5">
        <Users size={14} className="text-pink" />
        <span className="font-bold text-pink">{counts.followers}</span>
        <span className="text-gray">Followers</span>
      </span>
      <span className="text-light-gray/30">|</span>
      <span className="flex items-center gap-1.5">
        <Users size={14} className="text-purple" />
        <span className="font-bold text-purple">{counts.following}</span>
        <span className="text-gray">Following</span>
      </span>

      {/* Follow/Unfollow button for non-owners who are logged in */}
      {!isOwner && currentUserId && (
        <>
          <span className="text-light-gray/30">|</span>
          <button
            onClick={handleFollowToggle}
            disabled={actionLoading}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all disabled:opacity-50 ${
              isFollowing
                ? hovering
                  ? "border border-red-500/40 text-red-400 hover:bg-red-500/10"
                  : "border border-light-gray/20 text-gray"
                : "border border-pink/40 text-pink hover:bg-pink/10"
            }`}
          >
            {isFollowing ? (
              hovering ? (
                <>
                  <UserX size={13} />
                  Unfollow
                </>
              ) : (
                <>
                  <UserCheck size={13} />
                  Following
                </>
              )
            ) : (
              <>
                <UserPlus size={13} />
                Follow
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
