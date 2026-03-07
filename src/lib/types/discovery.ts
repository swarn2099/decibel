export type SupportedPlatform =
  | "spotify"
  | "soundcloud"
  | "ra"
  | "instagram"
  | "tiktok"
  | "youtube";

export interface ResolvedArtist {
  name: string;
  platform: SupportedPlatform;
  platform_url: string;
  photo_url?: string;
  soundcloud_url?: string;
  ra_url?: string;
  instagram_handle?: string;
  spotify_id?: string;
  spotify_url?: string;
  genres?: string[];
}

export interface DiscoverRequest {
  performer_id?: string; // existing performer
  resolved_artist?: ResolvedArtist; // new performer to auto-create
}

export interface DiscoverResponse {
  success: boolean;
  collection_id?: string;
  performer_id?: string;
  performer_name?: string;
  performer_slug?: string;
  already_discovered?: boolean;
  is_founder?: boolean;
}

export interface LinkResolveResponse {
  resolved: boolean;
  artist?: ResolvedArtist;
  existing_performer?: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
  };
  error?: string;
}
