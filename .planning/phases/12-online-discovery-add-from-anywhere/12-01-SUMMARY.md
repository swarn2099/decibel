---
phase: 12-online-discovery-add-from-anywhere
plan: 01
subsystem: api, ui
tags: [discovery, soundcloud-api, link-resolver, modal, passport]

requires:
  - phase: 11-passport-visual-overhaul
    provides: Passport timeline UI with PassportTimelineEntry type and capture_method/verified visual treatment
provides:
  - Link-based artist discovery API (resolve-link + discover endpoints)
  - Auto-performer-creation from music platform links
  - Discover modal UI on passport page
  - Discovery types (ResolvedArtist, DiscoverRequest, DiscoverResponse, LinkResolveResponse)
affects: [12-online-discovery-add-from-anywhere, passport, performer-profiles]

tech-stack:
  added: []
  patterns: [SoundCloud widget API for metadata resolution, multi-step modal with state machine, auto-performer-creation pipeline]

key-files:
  created:
    - src/lib/types/discovery.ts
    - src/app/api/discover/resolve-link/route.ts
    - src/app/api/discover/route.ts
    - src/app/passport/discover-modal.tsx
  modified:
    - src/app/passport/passport-client.tsx

key-decisions:
  - "SoundCloud widget API used for rich metadata (name, avatar); other platforms extract from URL slug"
  - "Auto-create fan record if missing during discovery (upsert pattern)"
  - "Timeline state lifted to PassportClient to allow prepending discoveries without refresh"

patterns-established:
  - "Link resolver pattern: detect platform via regex, extract identifier, resolve metadata, check DB for existing match"
  - "Auto-performer-creation: generate slug, check uniqueness, insert with claimed=false"

requirements-completed: [DISC-01, DISC-02]

duration: 4min
completed: 2026-03-07
---

# Phase 12 Plan 01: Link-Based Artist Discovery Summary

**Link-based artist discovery with resolve-link API (SoundCloud widget enrichment), auto-performer-creation, and 3-step discover modal on passport**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-07T03:55:38Z
- **Completed:** 2026-03-07T03:59:48Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Resolve-link API parses Spotify, SoundCloud, RA, Instagram, TikTok, YouTube links and extracts artist metadata (SoundCloud gets rich data via widget API)
- Discover API creates collections with capture_method="online", verified=false, and auto-creates performer profiles for artists not yet in DB
- 3-step discover modal (paste link, confirm artist, success) integrated into passport page with immediate timeline update

## Task Commits

Each task was committed atomically:

1. **Task 1: Discovery types and resolve-link + discover API endpoints** - `bdc2c3c` (feat)
2. **Task 2: Discover modal UI on passport page** - `dcacae4` (feat)

## Files Created/Modified
- `src/lib/types/discovery.ts` - Discovery types (ResolvedArtist, DiscoverRequest, DiscoverResponse, LinkResolveResponse, SupportedPlatform)
- `src/app/api/discover/resolve-link/route.ts` - POST endpoint: parses music platform URLs, resolves metadata, checks DB for existing performers
- `src/app/api/discover/route.ts` - POST endpoint: creates collection (and auto-creates performer if needed) with online capture method
- `src/app/passport/discover-modal.tsx` - Full-screen modal with paste/confirm/success flow, Decibel dark aesthetic
- `src/app/passport/passport-client.tsx` - Added "Discover an Artist" button, discover modal integration, lifted timeline to state

## Decisions Made
- SoundCloud widget API used for rich metadata (name, avatar); other platforms use URL slug extraction as a lightweight fallback
- Auto-create fan record via upsert if missing during discovery flow
- Timeline lifted to React state in PassportClient to allow instant prepend of new discoveries

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Discovery pipeline complete, ready for search-based discovery (Phase 12 Plan 02 if applicable)
- All new discoveries appear with "Discovered" outline badge treatment already built in Phase 11

---
*Phase: 12-online-discovery-add-from-anywhere*
*Completed: 2026-03-07*
