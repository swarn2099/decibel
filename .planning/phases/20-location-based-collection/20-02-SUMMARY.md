---
phase: 20-location-based-collection
plan: 02
subsystem: ui
tags: [react-native, reanimated, location, geofence, bottom-sheet, modal, expo]

requires:
  - phase: 20-location-based-collection/01
    provides: useLocation, useVenueDetection, locationStore hooks
  - phase: 17-home-profiles-collection
    provides: ConfirmationModal, useCollect, spring animation patterns

provides:
  - LocationBanner global overlay for auto-detection prompts
  - LocationPermissionModal for pre-OS explanation flow
  - NearbyVenueSheet bottom sheet for manual venue selection
  - Full Collect tab with "I'm at a show" manual trigger

affects: [21-map-leaderboard, 23-polish-app-store]

tech-stack:
  added: []
  patterns: [global overlay banner, permission explanation modal, bottom sheet venue picker]

key-files:
  created:
    - src/components/location/LocationPermissionModal.tsx
    - src/components/location/LocationBanner.tsx
    - src/components/location/NearbyVenueSheet.tsx
  modified:
    - app/_layout.tsx
    - app/(tabs)/collect.tsx

key-decisions:
  - "LocationBanner uses Reanimated SlideInUp/SlideOutUp entering/exiting animations (cleaner than manual translateY)"
  - "Multi-artist banner starts collapsed with Show/Hide toggle to avoid overwhelming the UI"
  - "Permission modal triggers after 2s delay post-auth to not interrupt initial app load"
  - "Collect tab always shows 'I'm at a show' button regardless of permission state as manual fallback"

patterns-established:
  - "Global overlay pattern: render outside Stack navigator in _layout.tsx, position absolute with zIndex"
  - "Permission explanation before OS prompt: custom modal -> requestPermission -> store shown flag"
  - "NearbyVenueSheet: reusable bottom sheet pattern with slide-up animation"

requirements-completed: [LOC-04, LOC-05, LOC-06]

duration: 4min
completed: 2026-03-09
---

# Phase 20 Plan 02: Location Collection UI Summary

**Auto-detection banner overlay, permission explanation modal, Collect tab with "I'm at a show" manual trigger, and multi-artist lineup display**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T01:52:28Z
- **Completed:** 2026-03-09T01:56:31Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- LocationBanner global overlay appears when near a venue with active event, supports single and multi-artist layouts
- LocationPermissionModal explains location usage before OS prompt, shown once after first login
- Collect tab replaces placeholder with full venue detection UI, nearby event cards, and manual trigger
- NearbyVenueSheet provides bottom sheet venue selection with per-artist collect buttons
- Graceful degradation when location denied: explanation + settings link, no crashes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LocationPermissionModal, LocationBanner, and wire into root layout** - `7e1fecb` (feat)
2. **Task 2: Build Collect tab with "I'm at a show" manual trigger and NearbyVenueSheet** - `df8e50c` (feat)

## Files Created/Modified
- `src/components/location/LocationPermissionModal.tsx` - Full-screen modal explaining location usage before OS permission request
- `src/components/location/LocationBanner.tsx` - Global auto-detection banner with single/multi-artist layouts and collect buttons
- `src/components/location/NearbyVenueSheet.tsx` - Bottom sheet listing nearby venues with artists and collect actions
- `app/_layout.tsx` - Wired LocationBanner and LocationPermissionModal as global overlays
- `app/(tabs)/collect.tsx` - Full Collect tab with nearby events, manual trigger, and graceful degradation

## Decisions Made
- Used Reanimated entering/exiting props (SlideInUp/SlideOutUp) instead of manual translateY for banner animation -- cleaner API
- Multi-artist banner starts collapsed to avoid UI clutter -- user taps "Show" to expand artist list
- Permission modal uses 2s delay after auth to not interrupt initial app experience
- "I'm at a show" button always visible regardless of permission state as manual fallback (LOC-06)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Location collection UI complete, ready for Phase 21 (Map + Leaderboard)
- Banner, permission flow, and manual trigger all wired to existing useVenueDetection and useCollect hooks
- All TypeScript compiles clean

---
*Phase: 20-location-based-collection*
*Completed: 2026-03-09*
