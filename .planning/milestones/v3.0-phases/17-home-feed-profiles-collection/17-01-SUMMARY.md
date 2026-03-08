---
phase: 17-home-feed-profiles-collection
plan: 01
subsystem: ui
tags: [react-native, tanstack-query, supabase, expo, home-feed]

requires:
  - phase: 16-setup-nav-auth
    provides: Tab navigation, Supabase client, design system, NativeWind
provides:
  - Home feed screen with upcoming events, Chicago residents, recently added artists
  - TanStack Query hooks for home feed data (useUpcomingEvents, useChicagoResidents, useRecentlyAdded)
  - Expanded Performer/Venue/HomeFeedEvent types matching DB schema
  - EventCard, ArtistRow, AddArtistBanner reusable components
affects: [17-02-artist-profile, 17-03-collection-flow, 19-search]

tech-stack:
  added: []
  patterns: [TanStack Query hooks with Supabase, Supabase join unwrapping, weekend range logic]

key-files:
  created:
    - src/hooks/useHomeFeed.ts
    - src/components/home/EventCard.tsx
    - src/components/home/ArtistRow.tsx
    - src/components/home/AddArtistBanner.tsx
  modified:
    - src/types/index.ts
    - app/(tabs)/index.tsx

key-decisions:
  - "Used pink accent color for DECIBEL title instead of gradient text (avoids adding @react-native-masked-view dependency)"
  - "Ported getUpcomingWeekendRange() logic directly from web app for consistent event date calculations"
  - "Set staleTime to 5min for events/recent, 10min for residents -- balances freshness with query efficiency"

patterns-established:
  - "TanStack Query hook pattern: useQuery with supabase.from().select() and join unwrapping"
  - "Artist fallback pattern: LinearGradient circle with initial letter when no photo_url"
  - "Section layout: SectionHeader component with uppercase tracking-widest text-gray styling"

requirements-completed: [HOME-01, HOME-02, HOME-03, HOME-04, HOME-05]

duration: 2min
completed: 2026-03-08
---

# Phase 17 Plan 01: Home Feed Summary

**Home feed screen with upcoming events (weekend range logic), Chicago resident artists, recently added artists, pull-to-refresh, and add-artist CTA using TanStack Query hooks over Supabase**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-08T23:38:51Z
- **Completed:** 2026-03-08T23:41:14Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Expanded types to match full DB schema (Performer with all social links, Venue, HomeFeedEvent)
- Three TanStack Query hooks fetching real Supabase data with proper stale times
- Full home feed screen with events list, two horizontal artist scrolls, and add-artist CTA
- Pull-to-refresh triggers simultaneous refetch on all three queries

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand types and create home feed hooks** - `bed6140` (feat)
2. **Task 2: Build Home Feed screen with all sections** - `21443bb` (feat)

## Files Created/Modified
- `src/types/index.ts` - Expanded Performer (full DB schema), added Venue and HomeFeedEvent types
- `src/hooks/useHomeFeed.ts` - useUpcomingEvents, useChicagoResidents, useRecentlyAdded hooks
- `src/components/home/EventCard.tsx` - Event card with artist photo, venue, time, external link
- `src/components/home/ArtistRow.tsx` - Horizontal FlatList of circular artist photos
- `src/components/home/AddArtistBanner.tsx` - Pink CTA banner navigating to Search tab
- `app/(tabs)/index.tsx` - Home screen with all sections, pull-to-refresh, loading state

## Decisions Made
- Used pink accent color for DECIBEL title instead of gradient text to avoid adding @react-native-masked-view dependency (can upgrade later in Phase 23 polish)
- Ported getUpcomingWeekendRange() logic directly from the web app for consistent date calculations
- Set staleTime to 5min for events/recently-added, 10min for Chicago residents

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed MaskedView dependency for gradient text**
- **Found during:** Task 2 (Home Feed screen)
- **Issue:** Plan implied gradient text for "DECIBEL" title but @react-native-masked-view not installed
- **Fix:** Used pink accent color text instead -- visually strong and avoids adding a dependency
- **Files modified:** app/(tabs)/index.tsx
- **Verification:** tsc --noEmit passes clean
- **Committed in:** 21443bb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor visual difference. Gradient text can be added in Polish phase (23) if desired.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Home feed complete, ready for Plan 02 (Artist Profile screen)
- Artist navigation (router.push to /artist/[slug]) is wired up but route doesn't exist yet -- Plan 02 will create it
- All types and hooks are exported and ready for reuse across other screens

---
*Phase: 17-home-feed-profiles-collection*
*Completed: 2026-03-08*
