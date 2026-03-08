---
phase: 17-home-feed-profiles-collection
plan: 03
subsystem: ui
tags: [react-native, expo, tanstack-query, supabase, reanimated, haptics, expo-blur, share]

requires:
  - phase: 17-home-feed-profiles-collection
    provides: "Artist profile screen at /artist/[slug] with full data display and hooks"
provides:
  - "Collect/discover mutation hooks calling web API and Supabase directly"
  - "CollectButton component with yellow collect and bordered discover buttons"
  - "ConfirmationModal with stamp press animation, tier badge, haptic feedback"
  - "SharePrompt with card generation fallback to native text share"
affects: [18-passport-badges, 20-location-collection]

tech-stack:
  added: []
  patterns: [stamp-press-animation, tier-color-system, auto-dismiss-modal]

key-files:
  created:
    - "src/hooks/useCollection.ts"
    - "src/components/collection/CollectButton.tsx"
    - "src/components/collection/ConfirmationModal.tsx"
    - "src/components/collection/SharePrompt.tsx"
  modified:
    - "app/artist/[slug].tsx"

key-decisions:
  - "Direct Supabase insert for discover flow (web API uses cookie auth incompatible with mobile)"
  - "Web API call for collect flow (handles tier calculation server-side)"
  - "Reanimated spring physics for stamp animation (damping:12, stiffness:180)"
  - "BlurView backdrop with 85% opacity for confirmation modal"

patterns-established:
  - "Tier system: calculateTier, TIER_COLORS, TIER_LABELS exported from useCollection"
  - "Stamp press animation: spring translateY + scale with delayed ink ring and tier badge"
  - "Auto-dismiss modal pattern: 5s timer cleared on user interaction"

requirements-completed: [COLL-01, COLL-02, COLL-03, COLL-04]

duration: 3min
completed: 2026-03-08
---

# Phase 17 Plan 03: Collection Flow Summary

**Collect/discover buttons on artist profile with stamp press confirmation animation, tier badges, haptic feedback, and native share prompt**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T23:44:56Z
- **Completed:** 2026-03-08T23:48:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- useCollect mutation calls web API, calculates tier-up, triggers haptic feedback
- useDiscover mutation inserts directly into Supabase collections table with founder badge attempt
- Full-screen confirmation modal with stamp press animation (spring physics slam-down + ink ring)
- Tier badge seals in with delayed animation, tier-up celebration with confetti particles
- SharePrompt tries web API card generation, falls back to native text share
- Auto-dismiss after 5 seconds, cleared on user interaction

## Task Commits

Each task was committed atomically:

1. **Task 1: Create collection hooks and buttons** - `7d92811` (feat)
2. **Task 2: Build confirmation modal and share prompt** - `ed23be9` (feat)

## Files Created/Modified
- `src/hooks/useCollection.ts` - TanStack Query mutations for collect (web API) and discover (direct Supabase), tier calculation helpers, tier color/label maps
- `src/components/collection/CollectButton.tsx` - Yellow collect button + bordered discover button with loading states
- `src/components/collection/ConfirmationModal.tsx` - Full-screen modal with stamp press animation, ink ring, tier badge, confetti, auto-dismiss
- `src/components/collection/SharePrompt.tsx` - Tries card generation API, falls back to native Share with text
- `app/artist/[slug].tsx` - Added collect/discover handlers, confirmation state, gradient fade, CollectButton + modals

## Decisions Made
- Direct Supabase insert for discover flow since the web discover endpoint uses cookie-based auth incompatible with mobile
- Web API call retained for collect flow since it handles tier calculation and fan_tiers upsert server-side
- Spring physics (damping:12, stiffness:180) for the stamp slam-down effect
- BlurView at intensity 40 with 85% bg opacity for the confirmation backdrop
- Confetti implemented as static colored dots with rotation (lightweight, no particle physics library needed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Collection flow complete, ready for Phase 18 (Passport + Badges + Sharing)
- Tier system (calculateTier, TIER_COLORS, TIER_LABELS) exported and reusable
- Phase 20 (Location-Based Collection) can enhance useCollect with location verification

---
*Phase: 17-home-feed-profiles-collection*
*Completed: 2026-03-08*
