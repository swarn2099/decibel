---
phase: 20-location-based-collection
plan: 03
subsystem: api
tags: [supabase, react-native, capture-method, location, data-integrity]

# Dependency graph
requires:
  - phase: 20-location-based-collection (20-01)
    provides: Location detection hooks and venue geofencing
  - phase: 20-location-based-collection (20-02)
    provides: Location banner, venue sheet, collect tab UI
provides:
  - capture_method passthrough from mobile location UI to database
  - Web API /api/collect accepts optional capture_method with 'qr' fallback
  - Location-based collections stored as capture_method='location' in DB
affects: [analytics, performer-dashboard, fan-passport]

# Tech tracking
tech-stack:
  added: []
  patterns: [optional-field-passthrough-with-default]

key-files:
  created: []
  modified:
    - /home/swarn/decibel/src/app/api/collect/route.ts
    - /home/swarn/decibel-mobile/src/hooks/useCollection.ts
    - /home/swarn/decibel-mobile/src/components/location/LocationBanner.tsx
    - /home/swarn/decibel-mobile/src/components/location/NearbyVenueSheet.tsx
    - /home/swarn/decibel-mobile/app/(tabs)/collect.tsx

key-decisions:
  - "capture_method defaults to 'qr' when not provided — backward compatible with web QR scans"

patterns-established:
  - "Optional field passthrough: mobile sends capture_method only for location collections, API defaults for all others"

requirements-completed: [LOC-01, LOC-02, LOC-03, LOC-04, LOC-05, LOC-06, LOC-07]

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 20 Plan 03: Gap Closure Summary

**capture_method passthrough from location UI to database — location collections now stored as 'location' instead of hardcoded 'qr'**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T02:03:13Z
- **Completed:** 2026-03-09T02:05:23Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Web API /api/collect reads optional capture_method from request body, defaults to 'qr'
- useCollect hook accepts and forwards capture_method when provided
- All 3 location-triggered UI components (LocationBanner, NearbyVenueSheet, Collect tab) pass capture_method='location'
- Artist profile collect (unchanged) continues using default 'qr' — backward compatible

## Task Commits

Each task was committed atomically:

1. **Task 1: Web API + useCollect hook** - `5ff78a3` (fix, web repo) + `8b4ed9d` (fix, mobile repo)
2. **Task 2: Location UI components pass capture_method='location'** - `b302c3c` (fix, mobile repo)

## Files Created/Modified
- `src/app/api/collect/route.ts` - Reads capture_method from body, defaults to 'qr'
- `decibel-mobile/src/hooks/useCollection.ts` - Optional capture_method in mutation type and POST body
- `decibel-mobile/src/components/location/LocationBanner.tsx` - Passes 'location' to useCollect
- `decibel-mobile/src/components/location/NearbyVenueSheet.tsx` - Passes 'location' to useCollect
- `decibel-mobile/app/(tabs)/collect.tsx` - Passes 'location' to useCollect

## Decisions Made
- capture_method defaults to 'qr' when not provided (backward compatible with web QR scans and existing mobile artist profile collect)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 20 (Location-Based Collection) is now fully complete with data integrity
- Location vs QR collections are distinguishable in the database
- Ready for Phase 21 (Map + Leaderboard) which can leverage capture_method for analytics

---
*Phase: 20-location-based-collection*
*Completed: 2026-03-09*
