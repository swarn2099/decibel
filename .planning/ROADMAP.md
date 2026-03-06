# Roadmap: Decibel

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-03-06)
- ✅ **v1.1 Growth Mechanics + Content Engine** - Phases 5-7 (shipped 2026-03-06)
- 🚧 **v1.2 Polish, Map, and Pipeline Fixes** - Phases 8-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) - SHIPPED 2026-03-06</summary>

- [x] Phase 1: Auth & Security (2/2 plans) — completed 2026-03-06
- [x] Phase 2: Fan Capture (2/2 plans) — completed 2026-03-06
- [x] Phase 3: Performer Dashboard (2/2 plans) — completed 2026-03-06
- [x] Phase 4: Fan Profile + Polish (2/2 plans) — completed 2026-03-06

</details>

<details>
<summary>✅ v1.1 Growth Mechanics + Content Engine (Phases 5-7) - SHIPPED 2026-03-06</summary>

- [x] Phase 5: Shareable Collection Cards (2/2 plans) — completed 2026-03-06
- [x] Phase 6: City Leaderboard (1/1 plan) — completed 2026-03-06
- [x] Phase 7: Content Generator (2/2 plans) — completed 2026-03-06

</details>

### v1.2 Polish, Map, and Pipeline Fixes (In Progress)

**Milestone Goal:** Fix UI bugs and data quality issues, add an interactive venue map, and improve scraper pipeline reliability.

- [x] **Phase 8: Bug Fixes** - Fix visual bugs across artist profiles, leaderboard, and CTA styling (completed 2026-03-06)
- [x] **Phase 9: Scene Map** - Interactive dark-themed venue map at /map with filtering and mobile support (completed 2026-03-06)
- [ ] **Phase 10: Scraper Pipeline** - Clean data quality issues and expand venue coverage

## Phase Details

### Phase 8: Bug Fixes
**Goal**: Artist profiles, leaderboard, and core CTAs display correctly with no visual glitches
**Depends on**: Nothing (independent of other v1.2 phases)
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04, BUG-05, BUG-06
**Success Criteria** (what must be TRUE):
  1. Artist profile Instagram links open the correct Instagram profile in one click
  2. Fan count on artist profiles shows "0 fans" label or is hidden entirely when zero — never a bare number
  3. Empty content sections (Tracks, etc.) are not visible on artist profiles when there is no data
  4. Leaderboard shows display names for fans, never raw email addresses
  5. "Collect" button on artist pages is visually dominant — larger, full-width on mobile, uses brand accent color
**Plans:** 1/1 plans complete

Plans:
- [ ] 08-01-PLAN.md — Fix artist profile bugs and leaderboard display issues

### Phase 9: Scene Map
**Goal**: Fans can explore Chicago's underground scene on an interactive dark-themed map at /map
**Depends on**: Nothing (independent of other v1.2 phases)
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, MAP-06
**Success Criteria** (what must be TRUE):
  1. Visiting /map renders a dark-themed interactive map centered on Chicago with venue markers
  2. Tapping a venue marker shows a popup with venue name, upcoming shows, and top performers at that venue
  3. Selecting a genre filter narrows visible venues to only those hosting events in that genre
  4. Toggling "Tonight" mode shows only venues with events today, with pulsing animation on active dots
  5. Map is fully usable on mobile — pan, zoom, tap markers, and read popups without horizontal scroll or overlap
**Plans:** 2/2 plans complete

Plans:
- [ ] 09-01-PLAN.md — Geocode venues and create map data API endpoint
- [ ] 09-02-PLAN.md — Build interactive map page with Leaflet, filters, and mobile support

### Phase 10: Scraper Pipeline
**Goal**: Performer data in the database is clean and scraper coverage expands to more Chicago venues
**Depends on**: Nothing (independent of other v1.2 phases)
**Requirements**: SCRP-01, SCRP-02, SCRP-03
**Success Criteria** (what must be TRUE):
  1. No performers table rows contain event names instead of actual artist names
  2. All Instagram handles in the database are stored as plain usernames (e.g., "djname") not full URLs
  3. Scraper pipeline covers additional Chicago venues beyond current EDMTrain/RA/DICE sources
**Plans**: TBD

Plans:
- [ ] 10-01: TBD

## Progress

**Execution Order:**
Phases 8, 9, and 10 are independent and can execute in any order.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Auth & Security | v1.0 | 2/2 | Complete | 2026-03-06 |
| 2. Fan Capture | v1.0 | 2/2 | Complete | 2026-03-06 |
| 3. Performer Dashboard | v1.0 | 2/2 | Complete | 2026-03-06 |
| 4. Fan Profile + Polish | v1.0 | 2/2 | Complete | 2026-03-06 |
| 5. Shareable Collection Cards | v1.1 | 2/2 | Complete | 2026-03-06 |
| 6. City Leaderboard | v1.1 | 1/1 | Complete | 2026-03-06 |
| 7. Content Generator | v1.1 | 2/2 | Complete | 2026-03-06 |
| 8. Bug Fixes | v1.2 | 1/1 | Complete | 2026-03-06 |
| 9. Scene Map | 2/2 | Complete   | 2026-03-06 | - |
| 10. Scraper Pipeline | v1.2 | 0/? | Not started | - |
