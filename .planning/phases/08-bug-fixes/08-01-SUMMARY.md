---
phase: 08-bug-fixes
plan: 01
subsystem: ui
tags: [next.js, supabase, tailwind, artist-profile, leaderboard]

requires:
  - phase: 04-fan-profile
    provides: "Fan auth, tier system, leaderboard page"
provides:
  - "Bug-free artist profiles with correct Instagram links, fan counts, no empty sections, dominant CTA"
  - "Leaderboard with privacy-safe fan names and brand-colored tier badges"
affects: [09-map-venue, 10-pipeline]

tech-stack:
  added: []
  patterns: ["cleanInstagramHandle() normalizer for social URLs", "getFanCount() via collections count query"]

key-files:
  created: []
  modified:
    - src/app/artist/[slug]/page.tsx
    - src/app/leaderboard/page.tsx
    - src/app/leaderboard/leaderboard-client.tsx

key-decisions:
  - "Instagram handle normalizer extracts username from full URLs via URL parsing with fallback regex"
  - "Fan count uses Supabase head-only count query for efficiency"
  - "Removed empty shows placeholder entirely rather than hiding — no useful UX value"

patterns-established:
  - "Social URL normalization: always clean/extract usernames before constructing links"
  - "Privacy-first data fetching: never select email for display purposes"

requirements-completed: [BUG-01, BUG-02, BUG-03, BUG-04, BUG-05, BUG-06]

duration: 3min
completed: 2026-03-06
---

# Phase 8 Plan 1: Bug Fixes Summary

**Fixed 6 UI bugs across artist profiles (Instagram double-URL, fan count, empty sections, CTA sizing) and leaderboard (email exposure, tier badge styling)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T22:32:46Z
- **Completed:** 2026-03-06T22:35:52Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Instagram links now always produce valid URLs regardless of DB format (full URL, handle, or @handle)
- Fan count displays in artist hero when > 0, completely hidden when 0
- Empty "Upcoming Shows" placeholder removed — only shows section when events exist
- Collect CTA is now full-width on mobile with pink glow effect for visual dominance
- Leaderboard never exposes email addresses — only display names or "Anonymous"
- Tier badges in both podium and ranked list use brand colors with consistent styling

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix artist profile bugs (Instagram, fan count, empty sections, CTA)** - `bc412a9` (fix)
2. **Task 2: Fix leaderboard fan names and tier badge styling** - `155bd74` (fix)

## Files Created/Modified
- `src/app/artist/[slug]/page.tsx` - Added cleanInstagramHandle(), getFanCount(), removed empty shows placeholder, made CTA dominant
- `src/app/leaderboard/page.tsx` - Removed email from fans select, changed fallback to skip email
- `src/app/leaderboard/leaderboard-client.tsx` - Updated podium badge styling, added tier badges to ranked list

## Decisions Made
- Used URL parsing with try/catch fallback for Instagram handle normalization (handles edge cases gracefully)
- Used Supabase `head: true` count query for fan count (efficient, no data transfer)
- Removed empty shows placeholder entirely rather than conditionally hiding

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Artist profile and leaderboard pages are clean and bug-free
- Ready for Phase 9 (Map & Venue) and Phase 10 (Pipeline) work

## Self-Check: PASSED

All files exist, all commits verified (bc412a9, 155bd74).

---
*Phase: 08-bug-fixes*
*Completed: 2026-03-06*
