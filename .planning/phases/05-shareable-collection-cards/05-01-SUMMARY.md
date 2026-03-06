---
phase: 05-shareable-collection-cards
plan: 01
subsystem: ui
tags: [next.js, og-image, satori, supabase, sharing, social-cards]

requires:
  - phase: 04-fan-profile-polish
    provides: fan_tiers table, tier constants, profile query patterns
provides:
  - Fan collection card page at /fan/[id]/card
  - Dynamic 1200x630 OG image at /fan/[id]/card/opengraph-image
  - Social sharing meta tags (OpenGraph + Twitter Card)
affects: [05-shareable-collection-cards, fan-profile]

tech-stack:
  added: [next/og ImageResponse, Satori]
  patterns: [dynamic OG image generation via route convention, inline Supabase client for Edge-compatible routes]

key-files:
  created:
    - src/app/fan/[id]/card/page.tsx
    - src/app/fan/[id]/card/opengraph-image.tsx
  modified: []

key-decisions:
  - "Used inline createClient in OG image route instead of supabase-admin.ts to avoid server-only import in Edge runtime"
  - "System sans-serif font in OG image instead of loading Poppins — simpler, avoids font fetch failures"
  - "Artist grid capped at 12 on page, 8 in OG image — keeps layout clean"

patterns-established:
  - "OG image route: use @supabase/supabase-js createClient directly, not supabase-admin.ts (server-only incompatible with Edge)"
  - "Fan public routes under /fan/[id]/* pattern"

requirements-completed: [SHARE-01, SHARE-02, SHARE-03]

duration: 2min
completed: 2026-03-06
---

# Phase 5 Plan 1: Shareable Collection Cards Summary

**Fan collection card page with dark-themed artist grid, tier badges, and dynamic 1200x630 OG image for social sharing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T19:56:03Z
- **Completed:** 2026-03-06T19:58:29Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fan collection card at /fan/[id]/card with Decibel dark aesthetic, artist photo grid, tier badges, and overflow indicator
- Dynamic OG image generation (1200x630 PNG) with artist photos, fan name, tier breakdown, and gradient branding
- Full OpenGraph and Twitter Card meta tags for social sharing previews

## Task Commits

Each task was committed atomically:

1. **Task 1: Fan collection card page** - `7c4cf9e` (feat)
2. **Task 2: Dynamic OG image generation** - `cca4555` (feat)

## Files Created/Modified
- `src/app/fan/[id]/card/page.tsx` - Server component rendering branded fan collection card with artist grid, tier badges, metadata
- `src/app/fan/[id]/card/opengraph-image.tsx` - Dynamic 1200x630 OG image via Next.js ImageResponse with artist photos and tier breakdown

## Decisions Made
- Used inline `createClient` from `@supabase/supabase-js` in OG image route to avoid `server-only` import (Edge runtime incompatible)
- Used system sans-serif in OG image instead of fetching Poppins — simpler and avoids CDN failures
- Capped artist display at 12 (page) and 8 (OG image) for clean layouts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Collection card and OG image routes are live and ready for social sharing
- Fan profile page could link to the shareable card URL
- Share button integration could be added in a future plan

---
*Phase: 05-shareable-collection-cards*
*Completed: 2026-03-06*
