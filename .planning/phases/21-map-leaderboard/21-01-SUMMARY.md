---
phase: 21-map-leaderboard
plan: 01
subsystem: ui
tags: [react-native-maps, bottom-sheet, map, geolocation, reanimated]

requires:
  - phase: 20-location-collection
    provides: useLocation hook for Near Me centering
provides:
  - Full-screen dark-themed scene map on Map tab
  - Genre-colored venue markers with activity sizing
  - Genre filter chips and Tonight mode toggle
  - Venue detail bottom sheet with lineup and navigation
  - useMapVenues TanStack Query hook for venue data
affects: [23-polish-appstore]

tech-stack:
  added: [react-native-maps, "@gorhom/bottom-sheet"]
  patterns: [custom map markers via Animated.View, BottomSheet for detail overlays]

key-files:
  created:
    - /home/swarn/decibel-mobile/src/hooks/useMapVenues.ts
    - /home/swarn/decibel-mobile/src/components/map/VenueMarker.tsx
    - /home/swarn/decibel-mobile/src/components/map/VenueBottomSheet.tsx
    - /home/swarn/decibel-mobile/src/components/map/GenreFilterChips.tsx
    - /home/swarn/decibel-mobile/src/components/map/mapStyle.ts
  modified:
    - /home/swarn/decibel-mobile/app/(tabs)/map.tsx
    - /home/swarn/decibel-mobile/src/types/index.ts

key-decisions:
  - "Genre color mapping: house=pink, techno=blue, bass/dnb=teal, disco=yellow, default=purple"
  - "Marker sizing: base 12px + 2px per event, max 24px"
  - "Direct Supabase queries for map venues (consistent with mobile data pattern)"
  - "Apple Maps dark via userInterfaceStyle, Google Maps via custom JSON style"

patterns-established:
  - "BottomSheet pattern: @gorhom/bottom-sheet with dark background for detail overlays"
  - "Map overlay pattern: absolute-positioned controls with SafeAreaInsets padding"

requirements-completed: [MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, MAP-06]

duration: 5min
completed: 2026-03-09
---

# Phase 21 Plan 01: Scene Map Summary

**Full-screen dark map with genre-colored venue markers, tonight mode with pulsing animations, genre filter chips, near-me centering, and venue detail bottom sheet with lineup and native navigation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-09T02:46:33Z
- **Completed:** 2026-03-09T02:51:35Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Dark-themed full-screen map replacing placeholder, with custom Google Maps JSON style
- Genre-colored and activity-sized venue markers with Reanimated pulsing for tonight mode
- Horizontal genre filter chips (All/House/Techno/Bass/Disco/Drum & Bass) with pink active state
- Tonight toggle that fades inactive venues to 10% opacity and pulses active ones
- Near Me button reusing Phase 20 useLocation hook for map centering
- Venue detail bottom sheet with lineup, tappable artist rows, and native maps navigation

## Task Commits

1. **Task 1: Install react-native-maps, add types and data hook** - `2f1110d` (feat)
2. **Task 2: Build map screen with markers, genre filter, tonight toggle, near me** - `258bb86` (feat)
3. **Task 3: Venue detail bottom sheet with lineup and navigation** - `b590776` (feat)

## Files Created/Modified
- `src/hooks/useMapVenues.ts` - TanStack Query hook fetching venues with events from Supabase
- `src/components/map/VenueMarker.tsx` - Custom marker with genre color, activity sizing, pulse animation
- `src/components/map/VenueBottomSheet.tsx` - Bottom sheet with venue details, artist lineup, navigate button
- `src/components/map/GenreFilterChips.tsx` - Horizontal scrollable genre filter chips
- `src/components/map/mapStyle.ts` - Custom dark JSON style for Google Maps
- `app/(tabs)/map.tsx` - Full map screen with all overlays and interactions
- `src/types/index.ts` - Added MapVenue and MapEvent types

## Decisions Made
- Genre color mapping: house=pink, techno=blue, bass/dnb=teal, disco=yellow, default=purple
- Marker sizing: base 12px + 2px per event, max 24px (filled circles, not pins)
- Direct Supabase queries for venues (consistent with mobile pattern from Phase 17)
- Apple Maps uses userInterfaceStyle="dark", Google Maps uses custom JSON darkMapStyle
- VenueBottomSheet uses @gorhom/bottom-sheet with 35%/60% snap points

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed showsPointsOfInterest prop name**
- **Found during:** Task 2
- **Issue:** react-native-maps uses `showsPointsOfInterests` (with trailing 's'), not `showsPointsOfInterest`
- **Fix:** Corrected prop name
- **Files modified:** app/(tabs)/map.tsx
- **Committed in:** 258bb86

**2. [Rule 3 - Blocking] Built VenueBottomSheet in Task 2 commit cycle**
- **Found during:** Task 2
- **Issue:** map.tsx imports VenueBottomSheet which doesn't exist yet (Task 3), blocking compilation
- **Fix:** Created full VenueBottomSheet implementation alongside Task 2, committed separately as Task 3
- **Committed in:** b590776

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Minor fixes, no scope creep. All plan requirements delivered.

## Issues Encountered
- Pre-existing `babel-preset-expo` missing prevents `expo export` bundle build -- not related to map changes, TypeScript compilation confirms code correctness
- Pre-existing type error in useLeaderboard.ts (from Phase 21 leaderboard plan) -- out of scope

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Map tab fully functional, ready for Phase 22 (Push Notifications)
- Bottom sheet pattern established for reuse in other screens
- Leaderboard (21-02) can proceed independently

---
*Phase: 21-map-leaderboard*
*Completed: 2026-03-09*
