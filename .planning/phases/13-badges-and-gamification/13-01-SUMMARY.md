---
phase: 13-badges-and-gamification
plan: 01
subsystem: api
tags: [badges, gamification, supabase, typescript]

requires:
  - phase: 11-passport-visual-overhaul
    provides: PassportStats interface, tier system, fan profile infrastructure
provides:
  - Badge type system (BadgeId, BadgeDefinition, EarnedBadge, BadgeCategory, BadgeRarity)
  - 18 badge definitions across 5 categories with rarity tiers
  - Pure badge evaluation engine (evaluateBadges)
  - Badge API endpoints (GET /api/badges, POST /api/badges/evaluate)
  - Retroactive badge backfill script
affects: [13-02, passport-ui, fan-profile]

tech-stack:
  added: []
  patterns: [pure-evaluation-engine, fan_badges-table]

key-files:
  created:
    - src/lib/types/badges.ts
    - src/lib/badges/definitions.ts
    - src/lib/badges/engine.ts
    - src/app/api/badges/route.ts
    - src/app/api/badges/evaluate/route.ts
    - scripts/backfill-badges.ts
  modified:
    - package.json

key-decisions:
  - "Badge evaluation is a pure function (evaluateBadges) with no DB calls for testability"
  - "Backfill script duplicates evaluation logic inline to avoid path alias issues in scripts/"
  - "fan_badges table SQL documented as manual prerequisite (Supabase JS client can't run DDL)"
  - "Connector badge uses 10+ collections as proxy for sharing until share tracking exists"

patterns-established:
  - "Pure evaluation pattern: data-fetching separated from logic for testability"
  - "Badge criteria checked against FanBadgeData interface, not raw DB queries"

requirements-completed: [BADGE-01, BADGE-02, BADGE-03, BADGE-04, BADGE-05, BADGE-08]

duration: 4min
completed: 2026-03-07
---

# Phase 13 Plan 01: Badge System Backend Summary

**18 badge definitions across 5 categories with pure evaluation engine, auth-guarded API endpoints, and retroactive backfill script**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-07T04:28:19Z
- **Completed:** 2026-03-07T04:32:11Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Badge type system with BadgeId union type, BadgeDefinition, EarnedBadge, and BadgeWithDefinition
- 18 badge definitions across discovery, attendance, exploration, streak, and social categories with 4 rarity tiers
- Pure evaluateBadges function with streak computation via ISO week grouping
- GET /api/badges and POST /api/badges/evaluate auth-guarded endpoints
- Backfill script for retroactive badge awards with progress logging

## Task Commits

Each task was committed atomically:

1. **Task 1: Badge types, definitions, and evaluation engine** - `4d98481` (feat)
2. **Task 2: Badge API endpoints and retroactive backfill script** - `6ea19f2` (feat)

## Files Created/Modified
- `src/lib/types/badges.ts` - Badge type definitions (BadgeId, BadgeDefinition, EarnedBadge, BadgeCategory, BadgeRarity)
- `src/lib/badges/definitions.ts` - 18 badge definitions with icons, thresholds, descriptions, rarity tiers
- `src/lib/badges/engine.ts` - Pure evaluation engine + DB helpers (buildFanBadgeData, checkNewBadges)
- `src/app/api/badges/route.ts` - GET endpoint returning fan's earned badges
- `src/app/api/badges/evaluate/route.ts` - POST endpoint evaluating and awarding new badges
- `scripts/backfill-badges.ts` - Retroactive badge backfill for all existing fans
- `package.json` - Added backfill-badges script

## Decisions Made
- Badge evaluation is a pure function (evaluateBadges) with no DB calls for testability
- Backfill script duplicates evaluation logic inline to avoid path alias issues in scripts/
- fan_badges table SQL documented as manual prerequisite (Supabase JS client cannot run DDL)
- Connector badge uses 10+ collections as proxy for sharing until share tracking exists
- Night Owl badge simplified to 3+ unique venues (late-night detection not feasible without event times)

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

The fan_badges table must be created in Supabase SQL Editor before using the badge system:

```sql
CREATE TABLE IF NOT EXISTS fan_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id uuid REFERENCES fans(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(fan_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_fan_badges_fan_id ON fan_badges(fan_id);
```

## Next Phase Readiness
- Badge definitions and API ready for Plan 02 (UI components)
- BadgeWithDefinition type ready for rendering in passport/profile
- Evaluate endpoint ready to be called after collection/discovery events

---
*Phase: 13-badges-and-gamification*
*Completed: 2026-03-07*
