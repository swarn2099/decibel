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
