---
phase: 15-passport-sharing-and-social
plan: 02
subsystem: social
tags: [follow, privacy, supabase, social-graph, passport]

requires:
  - phase: 11-passport-sharing-and-social
    provides: Passport client, public passport page, fan slug system
  - phase: 13-badges-and-gamification
    provides: Badge showcase on passport
provides:
  - Fan follow/unfollow API with mutual detection
  - Follower/following count display on passports
  - Privacy settings (public/private/mutual) on passport
  - Social counts component reusable across views
affects: [15-03-activity-feed, social-features]

tech-stack:
  added: []
  patterns: [optimistic-ui-follow, privacy-gated-content, count-only-queries]

key-files:
  created:
    - supabase/migrations/003_social.sql
    - src/lib/types/social.ts
    - src/app/api/social/follow/route.ts
    - src/app/api/social/followers/route.ts
    - src/app/api/social/following/route.ts
    - src/app/api/social/privacy/route.ts
    - src/app/passport/social-counts.tsx
  modified:
    - src/app/passport/passport-client.tsx
    - src/app/passport/[slug]/page.tsx
    - src/app/settings/settings-client.tsx

key-decisions:
  - "Follow status checked via followers list scan (not dedicated check endpoint) to reduce API surface"
  - "Privacy enforcement on server side in public passport page (not client-side)"
  - "fan_follows uses DB-level no_self_follow constraint for defense in depth"
  - "countOnly query param on followers/following endpoints for efficient count fetching"

patterns-established:
  - "Optimistic UI: toggle state immediately on follow/unfollow, revert on error"
  - "Privacy gating: server checks privacy + follow status before passing timeline data"

requirements-completed: [SOCL-03, SOCL-04, SOCL-05]

duration: 7min
completed: 2026-03-07
---

# Phase 15 Plan 02: Follow System & Privacy Summary

**Fan follow/unfollow social graph with privacy-gated passport visibility and optimistic UI**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-07T06:12:28Z
- **Completed:** 2026-03-07T06:19:09Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Full follow/unfollow API with self-follow prevention and mutual status detection
- Social counts (followers/following) visible on all passports with follow button on public views
- Three-tier privacy system (public/private/mutual) with server-side enforcement on public passport
- Privacy settings UI in settings page with radio-style selection

## Task Commits

Each task was committed atomically:

1. **Task 1: Create social tables, types, and follow/privacy API endpoints** - `d7fdf39` (feat)
2. **Task 2: Integrate social counts and follow button into passport + privacy into settings** - `248e1da` (feat)

## Files Created/Modified
- `supabase/migrations/003_social.sql` - fan_follows and fan_privacy table definitions
- `src/lib/types/social.ts` - FollowStatus, PrivacySetting, SocialCounts types
- `src/app/api/social/follow/route.ts` - POST follow/unfollow with mutual detection
- `src/app/api/social/followers/route.ts` - GET followers list or count
- `src/app/api/social/following/route.ts` - GET following list or count
- `src/app/api/social/privacy/route.ts` - GET/PUT privacy settings
- `src/app/passport/social-counts.tsx` - Follower/following counts + follow button component
- `src/app/passport/passport-client.tsx` - Added SocialCounts component and viewerFanId prop
- `src/app/passport/[slug]/page.tsx` - Viewer identity check, privacy enforcement, limited view
- `src/app/settings/settings-client.tsx` - Privacy settings section with three options

## Decisions Made
- Follow status checked by scanning followers list rather than adding a dedicated check endpoint
- Privacy enforcement happens server-side in the public passport page component
- Database-level constraint prevents self-follows as defense in depth
- countOnly query parameter on followers/following endpoints for efficient count fetching

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing Next.js 16/Turbopack build issue (pages-manifest.json ENOENT) unrelated to our changes. TypeScript compilation via `tsc --noEmit` passes clean.

## User Setup Required

**Database tables must be created manually.** Run `supabase/migrations/003_social.sql` in the Supabase SQL Editor to create:
- `fan_follows` table with indexes and no_self_follow constraint
- `fan_privacy` table with visibility check constraint

## Next Phase Readiness
- Social graph foundation ready for Activity Feed (Plan 03)
- Follow relationships enable feed filtering by who you follow
- Privacy settings respected across all public passport views

---
*Phase: 15-passport-sharing-and-social*
*Completed: 2026-03-07*
