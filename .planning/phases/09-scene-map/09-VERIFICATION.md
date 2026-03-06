---
phase: 09-scene-map
verified: 2026-03-06T23:45:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Visit /map and verify dark-themed Leaflet map renders centered on Chicago"
    expected: "Dark CartoDB tiles, pink CircleMarker dots on venue locations, centered near downtown Chicago"
    why_human: "Visual rendering of map tiles, marker placement accuracy, and dark theme styling cannot be verified programmatically"
  - test: "Tap a venue marker and inspect the popup"
    expected: "Dark popup (#15151C bg) with venue name in bold white, up to 3 performer avatars, event list with dates and pink performer name links to /artist/{slug}"
    why_human: "Popup visual styling, interactivity, and content layout need visual confirmation"
  - test: "Select a genre filter pill (e.g. techno) and verify markers update"
    expected: "Only venues hosting events with matching genre remain visible on map"
    why_human: "Filter correctness depends on live database data and visual marker updates"
  - test: "Toggle Tonight mode and verify pulsing animation"
    expected: "Only venues with events today are shown, dots have pulsing scale/opacity animation"
    why_human: "CSS animation and date-filtered results need visual and temporal verification"
  - test: "Test on mobile viewport — pan, zoom, tap markers, read popups"
    expected: "No horizontal scroll, popups fit within 280px, genre pills horizontally scrollable, touch targets adequate"
    why_human: "Mobile responsiveness, touch interactions, and layout fit require device testing"
---

# Phase 9: Scene Map Verification Report

**Phase Goal:** Fans can explore Chicago's underground scene on an interactive dark-themed map at /map
**Verified:** 2026-03-06T23:45:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Visiting /map renders a dark-themed interactive map centered on Chicago with venue markers | VERIFIED | `map-client.tsx` uses CartoDB dark_all tiles, center=[41.8827,-87.6233], CircleMarker with #FF4D6A fill, Leaflet popup CSS overrides in globals.css |
| 2 | Tapping a venue marker shows a popup with venue name, upcoming shows, and top performers | VERIFIED | Popup component (lines 161-204) renders venue.name, up to 5 events with performer links, up to 3 performer avatar images |
| 3 | Selecting a genre filter narrows visible venues to only those hosting events in that genre | VERIFIED | Genre pills in filter bar (lines 103-128), re-fetches `/api/map?genre={selected}`, API route filters by genre (lines 88-95) |
| 4 | Toggling Tonight mode shows only venues with events today with pulsing animation | VERIFIED | Tonight button (lines 88-98), fetches `?tonight=true`, API filters by today's date (line 32), `pulse-dot` CSS class applied to CircleMarkers (line 159), keyframes in globals.css |
| 5 | Map is fully usable on mobile -- pan, zoom, tap markers, read popups without overlap | VERIFIED | Map height `h-[calc(100vh-120px)]`, popup maxWidth 280, min dot radius 6px, filter bar `overflow-x-auto no-scrollbar`, hidden text label on mobile `hidden sm:inline` |

**Score:** 5/5 truths verified (code-level)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/types/map.ts` | Shared types MapVenue, MapEvent | VERIFIED | 20 lines, exports both interfaces with all required fields |
| `scripts/scrapers/geocode-venues.ts` | Geocoding script for venue coordinates | VERIFIED | 123 lines, Nominatim API with rate limiting, jitter fallback, Supabase updates |
| `src/app/api/map/route.ts` | Map data API endpoint | VERIFIED | 113 lines, GET handler with Supabase joins, genre/tonight filters, returns MapVenue[] |
| `src/app/map/page.tsx` | Map page server component | VERIFIED | 11 lines, metadata set, renders MapLoader |
| `src/app/map/map-loader.tsx` | Dynamic import wrapper (ssr:false) | VERIFIED | 16 lines, next/dynamic with loading spinner |
| `src/app/map/map-client.tsx` | Interactive map client component | VERIFIED | 211 lines, Leaflet MapContainer, CircleMarker, Popup, genre pills, Tonight toggle, fetch logic |
| `src/app/globals.css` | Pulsing animation + dark popup styles | VERIFIED | `@keyframes pulse-dot` and `.leaflet-popup-*` dark theme overrides present |
| `src/components/navbar.tsx` | Map link in navbar | VERIFIED | MapPin icon, Link to /map, active state via pathname check, hidden label on mobile |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `map-client.tsx` | `/api/map` | fetch with query params | WIRED | `fetch(\`/api/map${qs ? \`?${qs}\` : ""}\`)` at line 44, response parsed and used in state |
| `map-client.tsx` | `leaflet` | react-leaflet MapContainer | WIRED | MapContainer, TileLayer, CircleMarker, Popup all imported and rendered |
| `navbar.tsx` | `/map` | Link component | WIRED | `href="/map"` at line 49, active state detection at line 51 |
| `map-client.tsx` | `types/map.ts` | import MapVenue | WIRED | `import type { MapVenue } from "@/lib/types/map"` at line 6 |
| `api/map/route.ts` | Supabase venues/events/performers | Supabase query with joins | WIRED | `.from("venues").select(...)` with events!inner join and performer FK join |
| `page.tsx` | `map-loader.tsx` | import MapLoader | WIRED | Direct import and render |
| `map-loader.tsx` | `map-client.tsx` | dynamic import | WIRED | `dynamic(() => import("./map-client"), { ssr: false })` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MAP-01 | 09-02 | Interactive map page at /map with dark theme styling | SATISFIED | Dark CartoDB tiles, dark popup CSS, /map route exists |
| MAP-02 | 09-01, 09-02 | Every venue rendered as a dot sized/colored by activity level | SATISFIED | CircleMarker with radius scaled by event_count (6-14px), pink fill |
| MAP-03 | 09-01, 09-02 | Tapping a venue shows popup with name, upcoming shows, top performers | SATISFIED | Popup with venue name, event list (max 5), performer avatars (max 3) |
| MAP-04 | 09-01, 09-02 | Genre filter allows filtering venues by genre | SATISFIED | Genre pills UI + API genre param + server-side filtering |
| MAP-05 | 09-01, 09-02 | Tonight mode shows only venues with events today with pulsing animation | SATISFIED | Tonight toggle + API tonight param + pulse-dot CSS animation |
| MAP-06 | 09-02 | Map is fully mobile responsive | SATISFIED | viewport-height map, maxWidth popups, scrollable pills, min tap targets |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected |

No TODOs, FIXMEs, placeholders, empty handlers, or stub implementations found in any phase 9 files.

### Human Verification Required

All automated code-level checks pass. The following items need human testing because they involve visual rendering, real-time interaction, and device-specific behavior:

### 1. Dark Map Rendering

**Test:** Visit /map on the deployed site
**Expected:** Dark-themed Leaflet map with CartoDB tiles, pink venue dots visible, centered on Chicago
**Why human:** Map tile rendering, marker visibility, and overall visual quality need visual confirmation

### 2. Venue Popup Content

**Test:** Tap a venue marker dot
**Expected:** Dark popup with venue name, performer avatars, event list with dates and pink links to artist pages
**Why human:** Popup styling, content accuracy, and link functionality need interactive testing

### 3. Genre Filtering

**Test:** Scroll genre pills horizontally and tap one (e.g. "techno")
**Expected:** Visible venue markers update to show only venues with matching genre events
**Why human:** Filter correctness depends on live data and visual marker updates

### 4. Tonight Mode

**Test:** Toggle "Tonight" button
**Expected:** Only today's event venues shown, dots pulse with scale/opacity animation
**Why human:** Animation rendering and date-filtered accuracy need visual and temporal verification

### 5. Mobile Responsiveness

**Test:** Test on mobile device or responsive viewport
**Expected:** Full-height map, no horizontal page scroll, popups fit screen, genre pills scroll horizontally, tap targets are finger-friendly
**Why human:** Touch interactions, layout overflow, and gesture handling need device testing

### Gaps Summary

No code-level gaps found. All artifacts exist, are substantive (no stubs), and are fully wired. All 6 MAP requirements have supporting implementations. Build passes clean with /map as a static route.

Human verification is required to confirm visual rendering, interactive behavior, and mobile responsiveness match expectations.

---

_Verified: 2026-03-06T23:45:00Z_
_Verifier: Claude (gsd-verifier)_
