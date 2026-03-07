export type PrivacySetting = 'public' | 'private' | 'mutual';
export type FollowStatus = 'not_following' | 'following' | 'mutual';

export interface SocialCounts {
  followers: number;
  following: number;
}

export interface FollowResponse {
  status: FollowStatus;
  counts: SocialCounts;
}

export type ActivityType = 'collection' | 'discovery' | 'badge';

export interface ActivityFeedItem {
  id: string;
  type: ActivityType;
  fan: { id: string; name: string; slug: string };
  // For collection/discovery:
  performer?: { id: string; name: string; slug: string; photo_url: string | null };
  venue?: { name: string } | null;
  // For badge:
  badge?: { id: string; name: string; icon: string; rarity: string };
  created_at: string;
}

export interface ContactCheckResult {
  email: string;
  fan: { id: string; name: string; slug: string } | null;
  isFollowing: boolean;
}

export interface NewContactNotification {
  fan: { id: string; name: string; slug: string };
  joinedAt: string;
}
