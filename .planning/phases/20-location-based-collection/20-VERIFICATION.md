---
phase: 20-location-based-collection
verified: 2026-03-09T02:30:00Z
status: passed
score: 9/9 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  gaps_closed:
    - "Tapping Collect on the banner creates a verified collection with capture_method='location'"
  gaps_remaining: []
  regressions: []
---

# Phase 20: Location-Based Collection Verification Report

**Phase Goal:** Fan gets prompted to collect artists when they are physically at a venue with an active event -- the core differentiator
**Verified:** 2026-03-09T02:30:00Z
**Status:** passed
**Re-verification:** Yes -- after gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | App requests only 'While Using' location permission, never 'Always' | VERIFIED | useLocation.ts calls `requestForegroundPermissionsAsync` only; grep for `requestBackgroundPermissions` returns 0 matches in source code |
| 2 | Fan sees a clear explanation of why location is needed before the OS prompt | VERIFIED | LocationPermissionModal.tsx (148 lines) shows "Know When You're at a Show" with explanation text; triggered once after auth |
| 3 | When location is granted, app checks current position against venue geofences | VERIFIED | useVenueDetection.ts (135 lines) fetches venues from Supabase, computes haversine distance, filters by geofence_radius (default 200m), then queries events for today |
| 4 | App functions fully without location permission -- no crashes, no degraded UX | VERIFIED | useVenueDetection returns empty array when no permission; Collect tab shows "Enable Location" card or "Open Settings" based on status; NearbyVenueSheet shows "Location access is needed" message |
| 5 | When at a venue with an active event, a non-intrusive banner appears showing artist and venue | VERIFIED | LocationBanner.tsx (389 lines) renders as global overlay (position absolute, zIndex 100) in _layout.tsx; shows first non-dismissed event with artist photo, name, venue |
| 6 | Multi-artist lineups show all performing artists with individual collect buttons | VERIFIED | LocationBanner.tsx has collapsed/expanded multi-artist layout with per-performer Collect buttons; NearbyVenueSheet also lists all performers per venue |
| 7 | Fan can manually trigger 'I'm at a show' from the Collect tab as a fallback | VERIFIED | collect.tsx (559 lines) has large pink outlined "I'm at a Show" button that calls refetch() and opens NearbyVenueSheet; always visible regardless of permission state |
| 8 | Tapping X on the banner dismisses it and does not show again for that event | VERIFIED | LocationBanner calls `dismissEvent(eventId)` on X tap; useMemo filters out dismissed events via `isEventDismissed`; persisted to MMKV |
| 9 | Tapping Collect on the banner creates a verified collection with capture_method='location' | VERIFIED (was FAILED) | Web API reads `capture_method` from request body (line 13), defaults to 'qr' (line 40); useCollect accepts optional `capture_method` (line 42) and passes it in POST body (line 58); LocationBanner (line 139), NearbyVenueSheet (line 78), and collect.tsx (line 73) all pass `capture_method: 'location'` |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useLocation.ts` | Location permission + position getter | VERIFIED | 70 lines, foreground-only permission flow |
| `src/hooks/useVenueDetection.ts` | Foreground venue geofence matching | VERIFIED | 135 lines, haversine distance, Supabase query |
| `src/stores/locationStore.ts` | Dismissed events + permission state | VERIFIED | 70 lines, Zustand + MMKV persistence |
| `src/types/index.ts` | Venue with geofence_radius, ActiveVenueEvent type | VERIFIED | Types exported and consumed |
| `src/components/location/LocationBanner.tsx` | Global overlay banner | VERIFIED | 389 lines, Reanimated animations, dismiss + collect with capture_method='location' |
| `src/components/location/LocationPermissionModal.tsx` | Explanation modal before OS prompt | VERIFIED | 148 lines, full-screen modal with explanation |
| `src/components/location/NearbyVenueSheet.tsx` | Bottom sheet for manual venue selection | VERIFIED | 396 lines, venue list with per-artist collect, capture_method='location' |
| `app/(tabs)/collect.tsx` | Collect tab with manual trigger | VERIFIED | 559 lines, nearby events, "I'm at a Show" button, capture_method='location' |
| `/home/swarn/decibel/src/app/api/collect/route.ts` | Web API accepts capture_method | VERIFIED | 81 lines, reads capture_method from body, defaults to 'qr' |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| useVenueDetection.ts | useLocation.ts | import useLocation | WIRED | Line 3 import confirmed |
| useVenueDetection.ts | Supabase venues+events | Supabase query | WIRED | Queries venues table then events with performer join |
| LocationBanner.tsx | useVenueDetection.ts | import useVenueDetection | WIRED | Line 20 import confirmed |
| LocationBanner.tsx | useCollection.ts | useCollect mutation with capture_method='location' | WIRED | Line 21 import, line 139 passes capture_method |
| NearbyVenueSheet.tsx | useCollection.ts | useCollect mutation with capture_method='location' | WIRED | Line 78 passes capture_method |
| collect.tsx | useCollection.ts | useCollect mutation with capture_method='location' | WIRED | Line 73 passes capture_method |
| _layout.tsx | LocationBanner.tsx | renders as global overlay | WIRED | Line 21 import, line 108 renders when session exists |
| useCollect | Web API /api/collect | fetch POST with capture_method in body | WIRED | Line 58: JSON.stringify includes capture_method |
| Web API /api/collect | Supabase collections | insert with capture_method from body | WIRED | Line 40: `capture_method: capture_method || "qr"` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LOC-01 | 20-01 | Fan sees clear explanation of why location permission is needed before request | SATISFIED | LocationPermissionModal with explanation text, triggered once |
| LOC-02 | 20-01 | App requests "While Using" location permission (NOT "Always") | SATISFIED | Only `requestForegroundPermissionsAsync` used; zero background permission calls |
| LOC-03 | 20-01 | When app is in foreground, checks current location against venue geofences | SATISFIED | useVenueDetection computes haversine distance, filters by geofence_radius |
| LOC-04 | 20-02 | Non-intrusive banner appears with artist/venue info | SATISFIED | LocationBanner renders as overlay with artist photo, name, venue, Collect button |
| LOC-05 | 20-02 | Multiple-artist lineups show all artists with individual collect buttons | SATISFIED | Multi-artist layout in LocationBanner + NearbyVenueSheet |
| LOC-06 | 20-02 | "I'm at a show" manual trigger as fallback | SATISFIED | collect.tsx has "I'm at a Show" button, opens NearbyVenueSheet |
| LOC-07 | 20-01 | App functions fully without location permission (graceful degradation) | SATISFIED | All components handle denied state with explanation cards, settings links, empty arrays |

### Anti-Patterns Found

No anti-patterns found. Previous anti-patterns (hardcoded capture_method) have been resolved.
No TODO/FIXME/placeholder comments found in any Phase 20 files.
No empty implementations or stub patterns detected.

### Human Verification Required

### 1. Banner Slide-In Animation

**Test:** Launch app while location permission is granted and physically near a venue with an active event (or mock the data). Observe the banner appearing at the top.
**Expected:** Banner slides down smoothly from above the safe area with spring animation. Should not feel jarring or cover navigation elements.
**Why human:** Animation quality and feel cannot be verified programmatically.

### 2. Multi-Artist Expand/Collapse

**Test:** When banner shows a multi-artist event, tap the "Show" toggle.
**Expected:** Artist list expands below the venue header. Each artist has a photo (or gradient initials fallback) and individual Collect button. Tapping "Hide" collapses the list.
**Why human:** Layout behavior with variable content requires visual inspection.

### 3. Location-Based Collection Data Integrity

**Test:** Collect an artist from the location banner, then check the database record.
**Expected:** The `collections` row has `capture_method='location'`, not `'qr'`.
**Why human:** Requires real device with location access and database inspection to confirm end-to-end data flow.

### Gaps Summary

No gaps. All 9 observable truths verified. The previous gap (capture_method hardcoded to 'qr') has been fully resolved:

- Web API `/api/collect` now reads `capture_method` from the request body and defaults to `'qr'` when not provided (backward compatible)
- `useCollect` hook accepts an optional `capture_method` parameter and forwards it in the POST body
- All three location UI components (LocationBanner, NearbyVenueSheet, collect.tsx) pass `capture_method: 'location'`

No regressions detected in previously-passing items.

---

_Verified: 2026-03-09T02:30:00Z_
_Verifier: Claude (gsd-verifier)_
