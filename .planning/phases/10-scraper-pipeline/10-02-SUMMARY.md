---
phase: 10-scraper-pipeline
plan: 02
subsystem: scraping
tags: [19hz, html-parsing, electronic-music, chicago-events, scraper]

requires:
  - phase: 10-scraper-pipeline
    provides: scraper utilities (utils.ts), existing RA/DICE patterns
provides:
  - 19hz.info scraper for Chicago electronic music events
  - Expanded venue coverage (Smoke & Mirrors, Salt Shed, Ramova, Chop Shop, Le Nocturne, etc.)
  - 171 new performers, 186 new events from first run
affects: [scraper-pipeline, performer-database, venue-database]

tech-stack:
  added: []
  patterns: [HTML table parsing via regex, same cross-reference pattern as RA/DICE]

key-files:
  created:
    - scripts/scrapers/nineteenhz.ts
  modified:
    - scripts/scrapers/run-all.ts

key-decisions:
  - "Pivoted from Bandsintown to 19hz.info -- Bandsintown API fully locked down (403), 19hz is electronic-music-specific and better fit"
  - "Named file nineteenhz.ts to avoid leading-number filename issues"

patterns-established:
  - "HTML scraper pattern: fetch page, regex parse <tr> rows, extract structured data, same DB cross-reference flow as API scrapers"

requirements-completed: [SCRP-03]

duration: 7min
completed: 2026-03-07
---

# Phase 10 Plan 02: Scraper Pipeline Expansion Summary

**19hz.info HTML scraper for Chicago electronic music events -- 361 events parsed, 171 new performers, 186 events inserted across 20+ venues**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-06T23:54:37Z
- **Completed:** 2026-03-07T00:02:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Built 19hz.info scraper that parses Chicago electronic music events from their HTML listing page
- First run discovered 361 events across 20+ venues, 417 unique artists, inserted 171 new performers and 186 events
- Integrated into run-all pipeline as step 4/5 (enricher moved to 5/5)
- Top venues discovered: Sound-Bar (21), Radius (21), Smartbar (15), Spybar (15), Smoke & Mirrors (13), Salt Shed (13), Podlasie Club (12)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 19hz scraper** - `7567d7e` (feat)
2. **Task 2: Integrate into run-all pipeline** - `03dbe90` (feat)

## Files Created/Modified
- `scripts/scrapers/nineteenhz.ts` - 19hz.info Chicago electronic events scraper with HTML parsing, artist extraction, DB cross-reference
- `scripts/scrapers/run-all.ts` - Added 19hz as step 4/5, enricher moved to 5/5

## Decisions Made
- **Pivoted from Bandsintown to 19hz.info:** Bandsintown's API is fully locked down (returns 403 on all endpoints including v4 and legacy). 19hz.info is an electronic-music-specific community aggregator with structured HTML tables -- actually a better data source for underground electronic events.
- **Named file `nineteenhz.ts`:** Avoids filesystem issues with leading numbers in filenames.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Bandsintown API inaccessible, pivoted to 19hz.info**
- **Found during:** Task 1 (Create scraper)
- **Issue:** Bandsintown API returns 403 "User is not authorized" on all endpoints (v4 venues, v4 search, artist events, legacy endpoints). Both API key and public app_id approaches fail.
- **Fix:** Implemented 19hz.info scraper instead -- same objective (expand venue coverage), better source for electronic music. Used HTML table parsing instead of JSON API.
- **Files modified:** scripts/scrapers/nineteenhz.ts (created as nineteenhz.ts instead of bandsintown.ts)
- **Verification:** Scraper ran successfully, inserted 171 new performers and 186 events
- **Committed in:** 7567d7e

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Data source substitution achieves same objective (expanded venue coverage) with a better-fit source for electronic music. No scope creep.

## Issues Encountered
- 53 artists skipped due to slug conflicts (already exist in DB under different source) -- expected behavior, dedup working correctly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scraper pipeline now covers 4 sources: SoundCloud, RA, DICE, 19hz
- 19hz provides genre-tagged events which enriches the genre data
- New venues discovered can be geocoded via the existing geocoder script

---
*Phase: 10-scraper-pipeline*
*Completed: 2026-03-07*
