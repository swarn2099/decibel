---
phase: 09-scene-map
plan: 01
subsystem: api
tags: [geocoding, nominatim, openstreetmap, supabase, map, venues]

requires:
  - phase: 01-foundation
    provides: "Supabase database with venues, events, performers tables"
provides:
  - "MapVenue and MapEvent shared TypeScript types"
  - "Venue geocoding script (Nominatim OSM)"
  - "GET /api/map endpoint with genre and tonight filters"
affects: [09-scene-map]

tech-stack:
  added: [nominatim-geocoding]
  patterns: [venue-coordinate-jittering, map-api-endpoint]

key-files:
  created:
    - src/lib/types/map.ts
    - scripts/scrapers/geocode-venues.ts
    - src/app/api/map/route.ts
  modified: []

key-decisions:
  - "Used Nominatim OSM for free geocoding with 1 req/sec rate limit"
  - "Jitter ungeocodable venue coords by +/-0.02 degrees to prevent marker stacking"
  - "Genre filtering applied post-query in JS for flexibility with text[] column"

patterns-established:
  - "Map data API: venues with nested events and performers via Supabase inner join"

requirements-completed: [MAP-02, MAP-03, MAP-04, MAP-05]

duration: 3min
completed: 2026-03-06
---

# Phase 9 Plan 1: Geocode Venues & Map API Summary

**Venue geocoding via Nominatim OSM + /api/map endpoint returning venues with events, performers, and genre filtering**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T23:21:20Z
- **Completed:** 2026-03-06T23:24:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created shared MapVenue and MapEvent TypeScript types for map data
- Built geocoding script that resolves 355 venues via Nominatim with rate limiting and jitter fallback
- Created GET /api/map endpoint with Supabase joins, genre filtering, and tonight-only mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Define map types and geocode venues** - `673e31c` (feat)
2. **Task 2: Create /api/map endpoint** - `dcbc59d` (feat)

## Files Created/Modified
- `src/lib/types/map.ts` - Shared MapVenue and MapEvent interfaces
- `scripts/scrapers/geocode-venues.ts` - Nominatim geocoding script with rate limiting and jitter
- `src/app/api/map/route.ts` - GET endpoint returning venues with events, performers, genres

## Decisions Made
- Used Nominatim (OpenStreetMap) for geocoding -- free, no API key, 1 req/sec rate limit
- Ungeocodable venues get jittered default coordinates (+/-0.02 degrees) to prevent marker stacking on the map
- Genre filtering done in JS post-query since Supabase text[] containment filters are less flexible
- Performer join normalized to handle both array and object return shapes from Supabase

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Supabase performer type mismatch**
- **Found during:** Task 2
- **Issue:** Supabase returns performer FK join as array, TypeScript cast failed build
- **Fix:** Used `any[]` for events with runtime normalization of performer (array vs object)
- **Files modified:** src/app/api/map/route.ts
- **Verification:** npm run build passes
- **Committed in:** dcbc59d

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type handling fix. No scope creep.

## Issues Encountered
None beyond the type mismatch noted above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Map data API ready for the frontend map component (Plan 02)
- Geocoded venue coordinates available for marker placement
- Genre and tonight filters ready for UI controls

---
*Phase: 09-scene-map*
*Completed: 2026-03-06*
