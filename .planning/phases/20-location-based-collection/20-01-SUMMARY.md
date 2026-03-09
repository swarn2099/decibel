---
phase: 20-location-based-collection
plan: 01
subsystem: location
tags: [expo-location, geofence, haversine, zustand, mmkv, react-native]

# Dependency graph
requires:
  - phase: 17-home-profiles-collection
    provides: "Collection hooks (useCollect/useDiscover), Supabase client, types"
provides:
  - "useLocation hook — foreground permission flow + position getter"
  - "useVenueDetection hook — haversine geofence matching + active event lookup"
  - "useLocationStore — dismissed event tracking + permission state persistence"
  - "ActiveVenueEvent type — venue + performers + distance data structure"
  - "Extended Venue type with geofence_radius field"
affects: [20-02-PLAN, 22-push-notifications]

# Tech tracking
tech-stack:
  added: [expo-location]
  patterns: [foreground-only location, haversine distance, MMKV-persisted Zustand store]

key-files:
  created:
    - /home/swarn/decibel-mobile/src/hooks/useLocation.ts
    - /home/swarn/decibel-mobile/src/hooks/useVenueDetection.ts
    - /home/swarn/decibel-mobile/src/stores/locationStore.ts
  modified:
    - /home/swarn/decibel-mobile/src/types/index.ts
    - /home/swarn/decibel-mobile/package.json

key-decisions:
  - "Foreground-only location: requestForegroundPermissionsAsync only, never background"
  - "Haversine distance for geofence matching (accurate, no library needed)"
  - "2-minute staleTime on venue detection to avoid constant location polling"
  - "Default 200m geofence radius when venue has null geofence_radius"
  - "MMKV persistence for dismissed events and permission state"

patterns-established:
  - "Location hook pattern: check permission on mount, expose requestPermission and getCurrentPosition"
  - "Venue detection as TanStack Query with position-based refetching"
  - "MMKV JSON serialization for string array persistence in Zustand stores"

requirements-completed: [LOC-01, LOC-02, LOC-03, LOC-07]

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 20 Plan 01: Location Infrastructure Summary

**expo-location with foreground-only permission flow, haversine venue geofence matching, and MMKV-persisted dismissed event tracking**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T01:47:24Z
- **Completed:** 2026-03-09T01:50:03Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- expo-location installed with foreground-only permission request (never "Always")
- useVenueDetection hook matches fan position against venue geofences using haversine distance, queries Supabase for active events with performer data
- locationStore persists dismissed event IDs, explanation-shown flag, and permission-denied state via MMKV
- All code compiles with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install expo-location and create location + venue detection hooks** - `b1a3f3e` (feat)
2. **Task 2: Create location store for dismissed events and permission state** - `5fe4831` (feat)

## Files Created/Modified
- `src/hooks/useLocation.ts` - Foreground permission flow, position getter, explanation text
- `src/hooks/useVenueDetection.ts` - Haversine geofence matching, active event lookup via Supabase
- `src/stores/locationStore.ts` - Zustand + MMKV store for dismissed events, permission state
- `src/types/index.ts` - Extended Venue with geofence_radius, new ActiveVenueEvent type
- `package.json` - Added expo-location dependency

## Decisions Made
- Foreground-only location (requestForegroundPermissionsAsync) -- never background, per PRD and LOC-01
- Haversine distance for geofence matching -- accurate and simple (~10 lines, no external library)
- 2-minute staleTime on venue detection query to avoid constant location polling
- Default 200m geofence radius when venue's geofence_radius is null
- MMKV with JSON serialization for dismissed event ID array persistence
- MMKV `.remove()` not `.delete()` for key removal (v4 API)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] MMKV .delete() -> .remove() API mismatch**
- **Found during:** Task 2 (location store)
- **Issue:** Plan template used `.delete()` but react-native-mmkv v4 uses `.remove()` for key deletion
- **Fix:** Changed to `.remove()` matching existing codebase pattern in storage.ts
- **Files modified:** src/stores/locationStore.ts
- **Verification:** TypeScript compiles clean
- **Committed in:** 5fe4831 (Task 2 commit)

**2. [Rule 3 - Blocking] npm peer dependency conflict during expo-location install**
- **Found during:** Task 1 (expo-location install)
- **Issue:** react-dom@19.2.4 peer dep conflict with react@19.2.0
- **Fix:** Used --legacy-peer-deps flag (existing peer dep issue in project, not caused by expo-location)
- **Verification:** Package installed successfully, TypeScript compiles clean

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correct execution. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Location infrastructure complete, ready for Plan 20-02 (collection banner UI, "I'm at a show" trigger)
- useVenueDetection provides ActiveVenueEvent[] that Plan 02 will consume for banner display
- locationStore provides dismissed event tracking for banner suppression

---
*Phase: 20-location-based-collection*
*Completed: 2026-03-09*
