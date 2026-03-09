---
phase: 23-polish-app-store-prep
plan: 02
subsystem: ui
tags: [reanimated, haptics, mmkv, tanstack-query, offline-cache, pull-to-refresh, parallax]

requires:
  - phase: 18-passport-badges-sharing
    provides: PassportHeader, BadgeDetailModal, CollectionStamp components
  - phase: 17-home-profiles-collection
    provides: ConfirmationModal stamp animation, usePassport hooks
provides:
  - MMKV-persisted TanStack Query cache for offline data viewing
  - Enhanced stamp-slam animation with bounce-back overshoot and tier-up haptic
  - Badge unlock starburst ray + glow ring animation with success haptic
  - PassportHeader parallax (translateY, opacity fade, scale shrink) driven by scrollY
  - DecibelRefreshControl sound wave equalizer component (pink/purple/blue bars)
affects: [23-polish-app-store-prep]

tech-stack:
  added: ["@tanstack/react-query-persist-client", "@tanstack/query-sync-storage-persister"]
  patterns: [MMKV-backed query persistence, SharedValue prop passing for scroll-driven animation, branded RefreshControl overlay]

key-files:
  created:
    - src/lib/queryClient.ts
    - src/components/ui/PullToRefresh.tsx
  modified:
    - src/providers/QueryProvider.tsx
    - src/hooks/usePassport.ts
    - src/hooks/useArtistProfile.ts
    - src/components/collection/ConfirmationModal.tsx
    - src/components/passport/BadgeDetailModal.tsx
    - src/components/passport/PassportHeader.tsx
    - app/(tabs)/passport.tsx
    - app/(tabs)/index.tsx

key-decisions:
  - "createSyncStoragePersister with MMKV adapter for query cache persistence (separate MMKV instance from auth storage)"
  - "24h gcTime on passport queries, 4h on artist profiles -- balances offline access with freshness"
  - "PassportHeader owns its own parallax via scrollY SharedValue prop (cleaner than outer Animated.View wrapper)"
  - "DecibelRefreshControl overlays native RefreshControl with transparent tint for reliable gesture handling"
  - "SharedValue type imported directly from reanimated (not Animated.SharedValue namespace) for SDK 52+ compat"

patterns-established:
  - "SharedValue prop pattern: pass scrollY from parent scroll handler to child for scroll-driven animation"
  - "Branded RefreshControl: use native control with transparent tint + custom overlay for reliable pull-to-refresh"

requirements-completed: [POLISH-02, POLISH-03, POLISH-04, POLISH-05, POLISH-06]

duration: 10min
completed: 2026-03-09
---

# Phase 23 Plan 02: Offline Cache + Animations + Pull-to-Refresh Summary

**MMKV-persisted offline cache, stamp bounce-back + badge starburst animations with haptics, passport parallax header, and branded sound-wave pull-to-refresh**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-09T04:20:43Z
- **Completed:** 2026-03-09T04:30:44Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Passport collections and artist profiles persist to MMKV for offline viewing (24h/4h TTL)
- Collection stamp slam has satisfying bounce-back overshoot (1.05 -> 1.0) with Heavy haptic on impact and Success haptic on tier-up
- Badge unlock shows 8 starburst rays + glow ring animation with Success haptic (only for justEarned badges)
- PassportHeader parallax: shrinks (0.95x), fades, and slides up as user scrolls collection timeline
- Custom pull-to-refresh on Home and Passport shows 3 pulsing equalizer bars in brand colors

## Task Commits

Each task was committed atomically:

1. **Task 1: Offline cache + enhanced animations** - `704aefb` (feat)
2. **Task 2: Passport parallax + pull-to-refresh** - `79acb18` (feat)

## Files Created/Modified
- `src/lib/queryClient.ts` - MMKV persistence adapter for TanStack Query cache
- `src/components/ui/PullToRefresh.tsx` - Sound wave equalizer RefreshControl component
- `src/providers/QueryProvider.tsx` - PersistQueryClientProvider with MMKV persister
- `src/hooks/usePassport.ts` - 24h gcTime on passport stats + collections queries
- `src/hooks/useArtistProfile.ts` - 4h gcTime on artist profile query
- `src/components/collection/ConfirmationModal.tsx` - Stamp bounce-back + tier-up haptic
- `src/components/passport/BadgeDetailModal.tsx` - Starburst rays, glow ring, justEarned prop, haptic
- `src/components/passport/PassportHeader.tsx` - scrollY-driven parallax (translateY, opacity, scale)
- `app/(tabs)/passport.tsx` - DecibelRefreshControl, scrollY pass-through, refreshing state
- `app/(tabs)/index.tsx` - DecibelRefreshControl on Home screen

## Decisions Made
- Used `createSyncStoragePersister` from `@tanstack/query-sync-storage-persister` for proper Persister interface (raw get/set/remove doesn't satisfy the type)
- Separate MMKV instance (`tanstack-query-cache`) from auth storage to avoid key collisions
- Moved parallax logic into PassportHeader component itself (cleaner than wrapping in outer Animated.View)
- DecibelRefreshControl keeps native RefreshControl for gesture reliability, just makes tint transparent and overlays custom bars

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @tanstack/query-sync-storage-persister**
- **Found during:** Task 1 (Offline cache)
- **Issue:** PersistQueryClientProvider requires a Persister object (persistClient/restoreClient/removeClient), not raw get/set/remove
- **Fix:** Installed @tanstack/query-sync-storage-persister and used createSyncStoragePersister wrapper
- **Files modified:** package.json, package-lock.json, src/providers/QueryProvider.tsx
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 704aefb

**2. [Rule 1 - Bug] Fixed missing ActivityIndicator import in passport.tsx**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** ActivityIndicator used in ListFooter but not imported (pre-existing)
- **Fix:** Added to react-native import list
- **Files modified:** app/(tabs)/passport.tsx
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 704aefb

**3. [Rule 1 - Bug] Used SharedValue type import instead of Animated.SharedValue namespace**
- **Found during:** Task 1 and Task 2
- **Issue:** Animated.SharedValue<number> not exported from reanimated namespace in SDK 52+
- **Fix:** Import `type SharedValue` directly from react-native-reanimated
- **Files modified:** BadgeDetailModal.tsx, PullToRefresh.tsx, PassportHeader.tsx
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 704aefb, 79acb18

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for compilation. No scope creep.

**Note:** Task 1 commit (704aefb) was co-mingled with pre-existing 23-01 uncommitted changes due to timing overlap with the previous executor. All 23-02 changes are verified present in that commit.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All POLISH-02 through POLISH-06 requirements complete
- App ready for 23-03 (TestFlight prep / final polish)
- TypeScript compiles cleanly

---
*Phase: 23-polish-app-store-prep*
*Completed: 2026-03-09*
