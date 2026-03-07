---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: The Passport
status: completed
last_updated: "2026-03-07T05:34:35.350Z"
last_activity: 2026-03-07 — Completed 14-03-PLAN.md
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 10
  completed_plans: 10
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07)

**Core value:** Fans scan a QR code at a live show and instantly collect that performer -- no app install, no friction -- building a verified attendance record with tiered access rewards.
**Current focus:** v2.0 — The Passport (Phase 14: Enhanced Artist Profiles)

## Current Position

Phase: 14 of 15 (Enhanced Artist Profiles)
Plan: 3 of 3 complete
Status: Phase Complete
Last activity: 2026-03-07 — Completed 14-03-PLAN.md

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 19 (v1.0: 8, v1.1: 5, v1.2: 4, v2.0: 2)
- Average duration: --
- Total execution time: --

## Accumulated Context

### Decisions

- [11-01] Fan slug computed at query time (no DB migration) — slugify name or first 8 chars of ID
- [11-01] Stats fetched client-side via /api/passport/stats to keep page SSR fast
- [11-01] /profile redirects to /passport for backward compatibility
- [11-02] OG and story card use query params for data (edge runtime can't use Supabase Node client)
- [11-02] Stats section hidden on public passport since stats API requires auth
- [11-02] Web Share API used on mobile with download fallback on desktop
- [12-01] SoundCloud widget API for rich metadata; other platforms extract from URL slug
- [12-01] Auto-create fan record via upsert if missing during discovery flow
- [12-01] Timeline lifted to React state for instant discovery prepend
- [12-03] Genre overlap via Supabase .overlaps() filter for recommendation matching
- [12-03] Performers with upcoming events prioritized in recommendations
- [12-03] Fallback to popular performers when no genre overlap exists

Decisions are logged in PROJECT.md Key Decisions table.
- [Phase 12-02]: Spotify token stored in httpOnly cookie and deleted after import (one-time-use pattern)
- [Phase 12-02]: Artist matching uses case-insensitive ILIKE on performer name
- [Phase 12-02]: Auto-create performer from Spotify data if not in DB
- [Phase 13-01]: Badge evaluation is a pure function (evaluateBadges) with no DB calls for testability
- [Phase 13-01]: fan_badges table SQL documented as manual prerequisite (Supabase JS client can't run DDL)
- [Phase 13-01]: Connector badge uses 10+ collections as proxy until share tracking exists
- [Phase 13-02]: Badge showcase placed between stats and recommendations; public passport fetches badges server-side
- [Phase 14-01]: Spotify embed uses dark theme (theme=0) at 352px height for top tracks view
- [Phase 14-01]: Fan stats and similar artists fetched server-side via Promise.all for SSR performance
- [Phase 14-01]: Similar artists limited to 8, ordered by follower_count desc, using .overlaps() genre matching
- [Phase 14]: Journey state derived from collections + fan_tiers tables (no new DB migration needed)
- [Phase 14]: ArtistActions fetches journey on mount via client-side fetch for SSR compatibility
- [Phase 14]: Gradient props passed from server to client component for visual consistency
- [Phase 14-03]: Used signInWithOtp with emailRedirectTo claim param for magic link claim flow
- [Phase 14-03]: Auth callback handles claim query param to auto-claim performer post-verification
- [Phase 14-03]: Default auth callback redirect changed from /profile to /passport

### Pending Todos

None.

### Blockers/Concerns

- [Phase 1]: RLS policies written but not yet applied -- need DB password or Supabase CLI login to deploy
