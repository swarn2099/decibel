---
phase: 18-passport-badges-sharing
plan: 02
subsystem: ui
tags: [react-native, badges, gamification, tanstack-query, supabase]

requires:
  - phase: 17-home-profiles-collection
    provides: "Auth store, Supabase client, TanStack Query patterns, collection hooks"
provides:
  - "Badge type definitions (BadgeId, BadgeDefinition, BadgeWithStatus)"
  - "18 badge definitions ported from web (5 categories, 4 rarities)"
  - "useFanBadges hook for fetching earned badges with rarity percentages"
  - "BadgeGrid component (3-column FlatList with earned/locked visuals)"
  - "BadgeDetailModal component (dark card with badge details)"
affects: [18-03-sharing, 23-polish]

tech-stack:
  added: []
  patterns: ["Rarity-colored glow rings for badge tiers", "Earned vs locked visual states with opacity control"]

key-files:
  created:
    - decibel-mobile/src/types/badges.ts
    - decibel-mobile/src/constants/badges.ts
    - decibel-mobile/src/hooks/useBadges.ts
    - decibel-mobile/src/components/passport/BadgeGrid.tsx
    - decibel-mobile/src/components/passport/BadgeDetailModal.tsx
  modified: []

key-decisions:
  - "Ported badge types and definitions exactly from web for consistency"
  - "useFanBadges computes rarity percentages inline (cached 10min) rather than a separate query"
  - "StyleSheet over NativeWind for complex badge visuals (glow rings, embossed effects)"

patterns-established:
  - "Badge rarity color system: common=#8E8E9A, rare=#4D9AFF, epic=#9B6DFF, legendary=#FFD700"
  - "Earned badges get glow ring + rarity tint; locked badges get dashed border + 30% opacity"

requirements-completed: [PASS-04, PASS-05]

duration: 3min
completed: 2026-03-09
---

# Phase 18 Plan 02: Badge System Summary

**18 badge definitions with rarity-colored grid, earned/locked visual states, and detail modal showing rarity percentages and unlock criteria**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T00:27:36Z
- **Completed:** 2026-03-09T00:30:19Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- Ported all 18 badge definitions from web app (5 categories, 4 rarity levels)
- Built useFanBadges hook that queries fan_badges table and computes rarity percentages
- BadgeGrid renders 3-column FlatList with embossed earned badges and dark locked impressions
- BadgeDetailModal shows earned date + rarity % for earned, unlock criteria for locked

## Task Commits

Each task was committed atomically:

1. **Task 1: Badge types, definitions, and data hook** - `5c90ff1` (feat)
2. **Task 2: Badge grid and detail modal components** - `616360e` (feat)

## Files Created/Modified
- `src/types/badges.ts` - BadgeId, BadgeDefinition, EarnedBadge, BadgeWithStatus types
- `src/constants/badges.ts` - 18 badge definitions, RARITY_COLORS, getBadgesByCategory
- `src/hooks/useBadges.ts` - useFanBadges hook with Supabase queries and rarity calc
- `src/components/passport/BadgeGrid.tsx` - 3-column FlatList with earned/locked visuals
- `src/components/passport/BadgeDetailModal.tsx` - Dark modal with badge details

## Decisions Made
- Ported badge types and all 18 definitions exactly from web for cross-platform consistency
- Used StyleSheet over NativeWind for badge visuals (glow rings, embossed effects need precise control)
- useFanBadges computes rarity percentages inline with 10min cache instead of separate endpoint
- Criteria text shown in pink (#FF4D6A) for locked badges to draw attention

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Badge components ready for integration into passport screen by Plan 03
- BadgeGrid accepts BadgeWithStatus[] props -- Plan 03 will call useFanBadges() and pass data
- All TypeScript types clean, no errors

## Self-Check: PASSED

- All 5 created files verified on disk
- Both task commits verified in git log (5c90ff1, 616360e)
- TypeScript compilation clean (no errors)

---
*Phase: 18-passport-badges-sharing*
*Completed: 2026-03-09*
