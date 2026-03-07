export type BadgeCategory =
  | "discovery"
  | "attendance"
  | "exploration"
  | "streak"
  | "social";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export type BadgeId =
  // Discovery
  | "trailblazer"
  | "first-100"
  | "first-10-verified"
  // Attendance
  | "regular"
  | "devotee"
  | "inner-circle-badge"
  | "venue-local"
  | "venue-legend"
  // Exploration
  | "genre-explorer"
  | "city-hopper"
  | "night-owl"
  | "scene-veteran"
  | "centurion"
  // Streak
  | "on-fire"
  | "unstoppable"
  | "year-round"
  // Social
  | "tastemaker"
  | "connector";

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  icon: string;
  criteria: string;
}

export interface EarnedBadge {
  badge_id: BadgeId;
  fan_id: string;
  earned_at: string;
}

export type BadgeWithDefinition = EarnedBadge & {
  definition: BadgeDefinition;
};
