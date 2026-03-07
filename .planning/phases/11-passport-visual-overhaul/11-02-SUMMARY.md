---
phase: 11-passport-visual-overhaul
plan: 02
subsystem: ui
tags: [next-og, satori, image-generation, sharing, social-meta, edge-runtime]

requires:
  - phase: 11-passport-visual-overhaul (plan 01)
    provides: PassportClient component, passport types, stats API, fan slug pattern
provides:
  - Public passport route at /passport/[slug] with OG meta tags
  - OG image generation endpoint (1200x630)
  - Story card image generation endpoint (1080x1920)
  - Share menu with download + copy link functionality
  - Fan slug utility module
affects: [12-fan-capture-flow, marketing, social-sharing]

tech-stack:
  added: [next/og ImageResponse, satori]
  patterns: [edge runtime image generation, Web Share API with download fallback]

key-files:
  created:
    - src/app/passport/[slug]/page.tsx
    - src/app/api/og/passport/route.tsx
    - src/app/api/passport/share-card/route.tsx
    - src/lib/fan-slug.ts
  modified:
    - src/app/passport/passport-client.tsx

key-decisions:
  - "Fan slug computed at query time via fan-slug.ts utility — no DB migration needed"
  - "OG and story card use query params for data (edge runtime can't use Supabase Node client)"
  - "Stats section hidden on public passport since stats API requires auth"
  - "Web Share API used on mobile with download fallback on desktop"

patterns-established:
  - "Edge runtime image gen: use next/og ImageResponse with satori-compatible CSS (flexbox only)"
  - "Public vs private views: single component with isPublic prop toggling UI sections"

requirements-completed: [PASS-05, PASS-06, PASS-07]

duration: 4min
completed: 2026-03-07
---

# Phase 11 Plan 02: Public Passport & Sharing Summary

**Public passport URLs with OG meta preview cards and 1080x1920 story card generation for Instagram sharing**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-07T02:12:52Z
- **Completed:** 2026-03-07T02:17:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Public /passport/[slug] route viewable without login, with full OG meta tags for social previews
- Edge runtime OG image generation (1200x630) with Decibel branding and fan stats
- Story card generation (1080x1920) with stats grid, top artists, and passport URL
- Share menu with "Download Story Card" (Web Share API / download) and "Copy Passport Link" with toast feedback
- Public passport hides auth-specific controls and shows "Get your own passport" CTA

## Task Commits

Each task was committed atomically:

1. **Task 1: Public passport route with OG meta** - `f07c838` (feat)
2. **Task 2: Story card generation and share button** - `e5a92f4` (feat)

## Files Created/Modified
- `src/lib/fan-slug.ts` - Fan slug generation utility (slugify name or first 8 chars of ID)
- `src/app/passport/[slug]/page.tsx` - Public passport server component with generateMetadata for OG tags
- `src/app/api/og/passport/route.tsx` - Edge runtime OG image (1200x630) with dark background, gradient text, stat pills
- `src/app/api/passport/share-card/route.tsx` - Edge runtime story card (1080x1920) with full passport stats and branding
- `src/app/passport/passport-client.tsx` - Added isPublic prop, ShareMenu component, public CTA, conditional stats fetching

## Decisions Made
- Fan slug computed at query time via utility function rather than stored in DB -- avoids migration, fan count is small
- OG and story card endpoints accept data as query params since edge runtime cannot use Supabase Node client directly
- Stats section hidden on public passport view since the /api/passport/stats endpoint requires authentication
- Web Share API used on mobile for native sharing, with direct PNG download as desktop fallback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Passport sharing flow complete -- fans can share public URL and story cards
- Viral loop enabled: fans link /passport/[slug] in Instagram bio, share story cards after shows
- Ready for fan capture flow improvements in Phase 12

---
*Phase: 11-passport-visual-overhaul*
*Completed: 2026-03-07*
