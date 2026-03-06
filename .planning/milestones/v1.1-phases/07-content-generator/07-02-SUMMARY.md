---
phase: 07-content-generator
plan: 02
subsystem: content
tags: [playwright, instagram, content-generation, batch, weekly]

requires:
  - phase: 07-content-generator
    provides: three working content generators (spotlight, roundup, teaser)
provides:
  - Weekly batch generator producing 5-7 posts in a single dated output directory
affects: [content-pipeline, social-media]

tech-stack:
  added: []
  patterns: [dated-output-directory, optional-outputDir-parameter]

key-files:
  created: []
  modified:
    - scripts/content/generate-week.ts
    - scripts/content/spotlight.ts
    - scripts/content/roundup.ts
    - scripts/content/teaser.ts

key-decisions:
  - "Option A for output dir: optional outputDir param on each generator rather than moving files post-generation"
  - "Teaser count calculated dynamically to guarantee 5-7 total posts"

patterns-established:
  - "Weekly batch output: content/output/week-YYYY-MM-DD/ containing all PNG+TXT pairs"
  - "Generator outputDir param: optional second/last param defaults to content/output/ for standalone usage"

requirements-completed: [CONT-05]

duration: 2min
completed: 2026-03-06
---

# Phase 7 Plan 2: Weekly Batch Generator Summary

**Weekly batch generator outputs 5-7 mixed content posts (spotlights + roundup + teasers) into a single dated directory with dynamic teaser count to guarantee minimum post count**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T21:03:46Z
- **Completed:** 2026-03-06T21:05:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Weekly batch creates `content/output/week-YYYY-MM-DD/` directory for self-contained output
- Post mix guaranteed: 2-3 spotlights + 1 roundup + 1-2 teasers = 5-7 total
- All three generators accept optional `outputDir` param while maintaining standalone usage
- Summary output prints counts by type and output directory path

## Task Commits

Each task was committed atomically:

1. **Task 1: Update batch generator for dated output directory and correct mix** - `ce323d7` (feat)
2. **Task 2: End-to-end batch verification and cleanup** - verification only, no code changes

**Plan metadata:** (pending)

## Files Created/Modified
- `scripts/content/generate-week.ts` - Dated output dir, dynamic teaser count, typed summary output
- `scripts/content/spotlight.ts` - Added optional `outputDir` parameter
- `scripts/content/roundup.ts` - Added optional `outputDir` parameter
- `scripts/content/teaser.ts` - Added optional `outputDir` parameter

## Decisions Made
- Used Option A (outputDir param) over Option B (move files) for cleaner output without race conditions
- Teaser count formula: `Math.min(2, Math.max(1, 5 - spotlightCount - 1))` guarantees 5-7 total

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all scripts executed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Content pipeline complete: individual generators + weekly batch
- Ready for scheduling (cron) or manual weekly runs
- All v1.1 milestone plans complete

---
*Phase: 07-content-generator*
*Completed: 2026-03-06*
