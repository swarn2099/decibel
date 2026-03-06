export const TIER_COLORS: Record<string, { text: string; bg: string }> = {
  network: { text: "text-pink", bg: "bg-pink/10" },
  early_access: { text: "text-purple", bg: "bg-purple/10" },
  secret: { text: "text-blue", bg: "bg-blue/10" },
  inner_circle: { text: "text-teal", bg: "bg-teal/10" },
};

export const TIER_LABELS: Record<string, string> = {
  network: "Network",
  early_access: "Early Access",
  secret: "Secret",
  inner_circle: "Inner Circle",
};

export const TIER_THRESHOLDS: Record<string, number> = {
  network: 1,
  early_access: 3,
  secret: 5,
  inner_circle: 10,
};
