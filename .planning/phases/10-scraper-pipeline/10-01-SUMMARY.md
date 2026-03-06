---
phase: 10-scraper-pipeline
plan: 01
subsystem: database, scraping
tags: [supabase, typescript, data-cleanup, instagram, scraper]

requires:
  - phase: none
    provides: existing scrapers and performers table
provides:
  - normalizeInstagramHandle utility function
  - isNonArtistName with stronger heuristics (8-word limit, ALL CAPS, rave/night/takeover patterns)
  - clean-performers.ts one-shot DB cleanup script with dry-run/execute modes
affects: [scraper-runs, performer-data-quality]

tech-stack:
  added: []
  patterns: [instagram-handle-normalization, dry-run-cleanup-scripts]

key-files:
  created: [scripts/scrapers/clean-performers.ts]
  modified: [scripts/scrapers/utils.ts, scripts/scrapers/ra.ts]

key-decisions:
  - "Dry-run by default for cleanup script to prevent accidental data loss"
  - "Only auto-delete performers with 0-1 events; flag 2+ events for manual review"
  - "URL parsing with regex fallback for Instagram handle normalization"

patterns-established:
  - "normalizeInstagramHandle: always use this when storing Instagram handles from any scraper"
  - "Cleanup scripts default to --dry-run, require --execute for actual changes"

requirements-completed: [SCRP-01, SCRP-02]

duration: 2min
completed: 2026-03-06
---

# Phase 10 Plan 01: Scraper Pipeline Cleanup Summary

**DB cleanup script + hardened isNonArtistName heuristics + Instagram handle normalization across scrapers**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T23:54:27Z
- **Completed:** 2026-03-06T23:56:17Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Strengthened isNonArtistName with 10+ new patterns (rave, night, takeover, residency, price, ALL CAPS 4+ words, 8-word limit)
- Created normalizeInstagramHandle utility that extracts usernames from full URLs, @-prefixed handles
- Built clean-performers.ts that identified 3 bad performer entries and 37 Instagram handles needing normalization in dry-run
- Hardened RA scraper to use normalizeInstagramHandle on all 3 Instagram insert/update paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden utils and create cleanup script** - `1860a75` (feat)
2. **Task 2: Fix scrapers to normalize Instagram on insert** - `6791f91` (fix)

## Files Created/Modified
- `scripts/scrapers/utils.ts` - Added normalizeInstagramHandle, strengthened isNonArtistName with new patterns
- `scripts/scrapers/clean-performers.ts` - One-shot DB cleanup with Phase A (bad names) and Phase B (Instagram normalization)
- `scripts/scrapers/ra.ts` - Replaced manual .replace(/^@/, "") with normalizeInstagramHandle in 3 locations

## Decisions Made
- Dry-run is the default mode for the cleanup script -- requires explicit --execute flag to modify data
- Performers with 2+ events are flagged for review rather than auto-deleted (false positive safety)
- Instagram normalization uses URL parsing with regex fallback for robustness
- DICE scraper left unchanged -- confirmed it does not capture Instagram data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cleanup script ready to run with --execute when Swarn approves the dry-run output
- All future scraper runs will normalize Instagram handles automatically
- isNonArtistName heuristics may have minor false positives on spaced-out DJ names (e.g., "K A R I M") -- these are edge cases caught by the review-not-delete safety net

---
*Phase: 10-scraper-pipeline*
*Completed: 2026-03-06*
