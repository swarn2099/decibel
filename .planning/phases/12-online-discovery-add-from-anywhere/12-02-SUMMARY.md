---
phase: 12-online-discovery-add-from-anywhere
plan: 02
subsystem: api, ui
tags: [spotify, oauth, import, passport, apple-music]

requires:
  - phase: 12-online-discovery-add-from-anywhere
    provides: Link-based discovery API and discover modal on passport
provides:
  - Spotify OAuth flow (auth, callback, import endpoints)
  - Top artists import as passport discoveries
  - Upcoming show detection for imported artists
  - Apple Music "coming soon" stub UI
affects: [passport, performer-profiles, fan-engagement]

tech-stack:
  added: []
  patterns: [Spotify OAuth with httpOnly cookie token storage, one-time-use token pattern, batch artist import with DB matching]

key-files:
  created:
    - src/app/api/spotify/auth/route.ts
    - src/app/api/spotify/callback/route.ts
    - src/app/api/spotify/import/route.ts
    - src/app/passport/spotify-import.tsx
  modified:
    - src/app/passport/passport-client.tsx

key-decisions:
  - "Spotify token stored in httpOnly cookie and deleted after import (one-time-use pattern)"
  - "Artist matching uses case-insensitive ILIKE on performer name"
  - "Auto-create performer from Spotify data if not in DB (reuses slug generation from discover API)"

patterns-established:
  - "OAuth integration pattern: auth redirect -> callback with cookie -> import endpoint -> cookie cleanup"
  - "Batch import with individual error handling: skip failed artists, report results"

requirements-completed: [DISC-03, DISC-04, DISC-06]

duration: 4min
completed: 2026-03-07
---

# Phase 12 Plan 02: Spotify Import & Apple Music Stub Summary

**Spotify OAuth integration importing fan's top 20 artists as passport discoveries with upcoming show detection, plus Apple Music "coming soon" stub**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-07T04:02:10Z
- **Completed:** 2026-03-07T04:10:00Z
- **Tasks:** 2 (+ 1 auto-approved checkpoint)
- **Files modified:** 5

## Accomplishments
- Spotify OAuth flow with auth redirect, token exchange callback, and httpOnly cookie storage
- Import endpoint fetches top 20 artists, matches against performer DB (case-insensitive), auto-creates missing performers, and flags artists with upcoming local shows
- SpotifyImport UI component with connect/importing/results/error states, auto-triggers on OAuth redirect
- Apple Music stub with gradient styling and disabled "Soon" button

## Task Commits

Each task was committed atomically:

1. **Task 1: Spotify OAuth flow and top artists import API** - `bcf3ea2` (feat)
2. **Task 2: Spotify import UI + Apple Music stub on passport** - `b64b5c2` (feat)

## Files Created/Modified
- `src/app/api/spotify/auth/route.ts` - GET endpoint redirecting to Spotify OAuth with user-top-read scope
- `src/app/api/spotify/callback/route.ts` - GET callback exchanging code for token, storing in httpOnly cookie
- `src/app/api/spotify/import/route.ts` - POST endpoint fetching top artists, creating performers + collections, checking upcoming events
- `src/app/passport/spotify-import.tsx` - Client component with Spotify connect button, import progress, results grid, Apple Music stub
- `src/app/passport/passport-client.tsx` - Added Music Connections section with SpotifyImport integration and Spotify error toast

## Decisions Made
- Spotify token stored in httpOnly cookie and deleted after single import use (no persistent token storage needed)
- Artist matching uses case-insensitive ILIKE on name field for DB lookup
- Auto-creates performer records from Spotify data when not found in DB, reusing slug generation pattern from Plan 01

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Stale .next build cache caused ENOENT errors on first build attempts; resolved by clearing .next directory

## User Setup Required
Spotify Developer credentials required:
- `SPOTIFY_CLIENT_ID` - from Spotify Developer Dashboard
- `SPOTIFY_CLIENT_SECRET` - from Spotify Developer Dashboard
- Redirect URI must be configured in Spotify app: `https://decibel-swarn-singhs-projects.vercel.app/api/spotify/callback`

## Next Phase Readiness
- Spotify import complete, fans can now populate passport from listening history
- Ready for Phase 13+ (mobile app, push notifications, etc.)

---
*Phase: 12-online-discovery-add-from-anywhere*
*Completed: 2026-03-07*
