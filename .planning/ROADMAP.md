# Roadmap: Decibel

## Milestones

- v1.0 MVP - Phases 1-4 (shipped 2026-03-06)
- v1.1 Growth Mechanics + Content Engine - Phases 5-7 (shipped 2026-03-06)
- v1.2 Polish, Map, and Pipeline Fixes - Phases 8-10 (shipped 2026-03-07)
- v2.0 The Passport - Phases 11-15 (shipped 2026-03-07)
- v3.0 Decibel Mobile - Phases 16-23 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-03-06</summary>

- [x] Phase 1: Auth & Security (2/2 plans) -- completed 2026-03-06
- [x] Phase 2: Fan Capture (2/2 plans) -- completed 2026-03-06
- [x] Phase 3: Performer Dashboard (2/2 plans) -- completed 2026-03-06
- [x] Phase 4: Fan Profile + Polish (2/2 plans) -- completed 2026-03-06

</details>

<details>
<summary>v1.1 Growth Mechanics + Content Engine (Phases 5-7) - SHIPPED 2026-03-06</summary>

- [x] Phase 5: Shareable Collection Cards (2/2 plans) -- completed 2026-03-06
- [x] Phase 6: City Leaderboard (1/1 plan) -- completed 2026-03-06
- [x] Phase 7: Content Generator (2/2 plans) -- completed 2026-03-06

</details>

<details>
<summary>v1.2 Polish, Map, and Pipeline Fixes (Phases 8-10) - SHIPPED 2026-03-07</summary>

- [x] Phase 8: Bug Fixes (1/1 plan) -- completed 2026-03-06
- [x] Phase 9: Scene Map (2/2 plans) -- completed 2026-03-06
- [x] Phase 10: Scraper Pipeline (2/2 plans) -- completed 2026-03-07

</details>

<details>
<summary>v2.0 The Passport (Phases 11-15) - SHIPPED 2026-03-07</summary>

- [x] Phase 11: Passport Visual Overhaul (2/2 plans) -- completed 2026-03-07
- [x] Phase 12: Online Discovery + Add From Anywhere (3/3 plans) -- completed 2026-03-07
- [x] Phase 13: Badges and Gamification (2/2 plans) -- completed 2026-03-07
- [x] Phase 14: Enhanced Artist Profiles (3/3 plans) -- completed 2026-03-07
- [x] Phase 15: Passport Sharing and Social (3/3 plans) -- completed 2026-03-07

</details>

### v3.0 Decibel Mobile (In Progress)

**Milestone Goal:** Build the React Native (Expo) mobile app that mirrors the web experience and adds native capabilities: location-based collection, push notifications, and share extension.

- [x] **Phase 16: Setup + Navigation + Auth** - Expo project, tab nav, auth, design system, Supabase connection
- [x] **Phase 17: Home Feed + Artist Profiles + Collection** - Browsable home feed, rich artist profiles, and collect/discover flows (completed 2026-03-08)
- [x] **Phase 18: Passport + Badges + Sharing** - Rich passport with stamps, badges, stats, and shareable cards (completed 2026-03-09)
- [x] **Phase 19: Search + Add Artist + Share Extension** - Search, Spotify-powered add flow, and OS-level share target (completed 2026-03-09)
- [x] **Phase 20: Location-Based Collection** - Venue geofence detection and auto-collection prompting (completed 2026-03-09)
- [x] **Phase 21: Map + Leaderboard** - Dark-themed scene map and competitive leaderboard (completed 2026-03-09)
- [x] **Phase 22: Push Notifications** - Event alerts, badge unlocks, tier-ups, and deep-linked notifications (completed 2026-03-09)
- [ ] **Phase 23: Polish + App Store Prep** - Animations, offline support, error states, TestFlight submission

## Phase Details

### Phase 16: Setup + Navigation + Auth
**Goal**: Fan can install the app, onboard, sign in, and navigate between all five tabs
**Depends on**: Nothing (first phase of v3.0)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06
**Success Criteria** (what must be TRUE):
  1. Fan can install dev build and see onboarding slides on first launch
  2. Fan can sign in via magic link email and session persists across app restarts
  3. Fan can navigate between Home, Search, Collect, Map, and Passport tabs with correct icons and dark theme
  4. App connects to the same Supabase backend as the web app (shared data)
**Plans**: Complete

Plans:
- [x] 16-01-PLAN.md -- Expo project setup, navigation, auth, design system (complete)

### Phase 17: Home Feed + Artist Profiles + Collection
**Goal**: Fan can browse the home feed, view rich artist profiles, and collect or discover artists from their phone
**Depends on**: Phase 16
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, COLL-01, COLL-02, COLL-03, COLL-04
**Success Criteria** (what must be TRUE):
  1. Fan can scroll a home feed showing upcoming events, local resident artists, and recently added artists with pull-to-refresh
  2. Fan can tap an artist to view a full profile screen with hero photo, genres, social links, tracks/mixes, upcoming shows, founder badge, and similar artists
  3. Fan can tap "Collect" on an artist profile (with location check) and see a confirmation animation with artist name, date, and tier badge
  4. Fan can tap "Discover" on an artist profile to add an online discovery to their passport
  5. After collecting or discovering, fan is prompted to share a generated card
**Plans**: 3 plans

Plans:
- [ ] 17-01-PLAN.md -- Home feed with events, resident artists, recently added, pull-to-refresh
- [ ] 17-02-PLAN.md -- Artist profile screen with hero, stats, social links, shows, similar artists
- [ ] 17-03-PLAN.md -- Collect/discover flow with confirmation animation and share prompt

### Phase 18: Passport + Badges + Sharing
**Goal**: Fan has a rich, visual passport showing their collection history, badges, and stats -- and can share any of it as branded cards
**Depends on**: Phase 16
**Requirements**: PASS-01, PASS-02, PASS-03, PASS-04, PASS-05, PASS-06, PASS-07, PASS-08, PASS-09, PASS-10
**Success Criteria** (what must be TRUE):
  1. Fan can view their passport with header (name, city, avatar), stats bar, and collection timeline where verified stamps are full-color and discovered stamps are muted
  2. Fan can tap a collected artist to see tier progress (e.g., "3/5 scans to Secret tier")
  3. Fan can view earned badges in a grid and tap locked badges to see unlock requirements
  4. Fan can generate and share passport summary, single-artist, and badge achievement cards via Instagram Stories, iMessage, copy link, or save to camera roll
  5. Fan can copy their public passport URL
**Plans**: 3 plans

Plans:
- [ ] 18-01-PLAN.md -- Passport screen with stamps, stats bar, header, tier progress modal
- [ ] 18-02-PLAN.md -- Badge system with grid, earned/locked visuals, detail modals
- [ ] 18-03-PLAN.md -- Share card generation, share sheet, public passport URL copy

### Phase 19: Search + Add Artist + Share Extension
**Goal**: Fan can find any artist in Decibel, add missing artists via Spotify search with founder badge, and share links TO Decibel from other apps
**Depends on**: Phase 16
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, SRCH-07, SHARE-01, SHARE-02
**Success Criteria** (what must be TRUE):
  1. Fan can search existing Decibel artists with autocomplete results
  2. Fan can search Spotify for artists not in Decibel and add them (under 1M listeners = founder badge, over 1M = regular add)
  3. Fan sees loading animation during profile scraping and celebration screen when earning founder badge
  4. Fan can share a Spotify/SoundCloud/Instagram link TO Decibel from another app, which opens the artist profile or triggers the add flow
**Plans**: 3 plans

Plans:
- [ ] 19-01-PLAN.md -- Search screen with Decibel autocomplete and Spotify search integration
- [ ] 19-02-PLAN.md -- Add artist flow with loading animation, founder celebration, auto-discover
- [ ] 19-03-PLAN.md -- Share extension: URL parser, Android intent filter, paste-a-link fallback

### Phase 20: Location-Based Collection
**Goal**: Fan gets prompted to collect artists when they are physically at a venue with an active event -- the core differentiator
**Depends on**: Phase 17 (needs artist profiles and collection flow)
**Requirements**: LOC-01, LOC-02, LOC-03, LOC-04, LOC-05, LOC-06, LOC-07
**Success Criteria** (what must be TRUE):
  1. Fan sees a clear explanation before location permission is requested, and the app only asks for "While Using" (foreground) permission
  2. When at a venue with an active event, a non-intrusive banner appears showing the artist and venue with a "Collect?" prompt
  3. Multi-artist lineups show all performing artists with individual collect buttons
  4. Fan can manually trigger "I'm at a show" from the home screen as a fallback
  5. App functions fully without location permission granted (graceful degradation)
**Plans**: 2 plans

Plans:
- [ ] 20-01-PLAN.md -- Location permission flow, venue geofence detection hooks, dismissed event store
- [ ] 20-02-PLAN.md -- Collection banner overlay, multi-artist lineup, Collect tab with manual trigger

### Phase 21: Map + Leaderboard
**Goal**: Fan can explore the local scene on a dark-themed map and compete on leaderboards
**Depends on**: Phase 16
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, MAP-06, LEAD-01, LEAD-02, LEAD-03, LEAD-04, LEAD-05
**Success Criteria** (what must be TRUE):
  1. Fan can view a full-screen dark-themed map with venue markers sized by activity and colored by genre
  2. Fan can tap a venue marker to see a bottom sheet with venue name, upcoming events, and top artists
  3. Fan can filter the map by genre and toggle "Tonight" mode showing only active venues with pulsing markers
  4. Fan can view fan and performer leaderboards with weekly/monthly/all-time filters, seeing their own position highlighted
  5. Fan can generate and share a "rank" image from the leaderboard
**Plans**: 2 plans

Plans:
- [ ] 21-01-PLAN.md -- Scene map with dark style, venue markers, genre filter, tonight mode, venue bottom sheet
- [ ] 21-02-PLAN.md -- Leaderboard with fan/performer tabs, time filters, podium, share rank

### Phase 22: Push Notifications
**Goal**: Fan stays engaged through timely, relevant push notifications that deep-link to the right screen
**Depends on**: Phase 16
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06, NOTIF-07, NOTIF-08, NOTIF-09
**Success Criteria** (what must be TRUE):
  1. Push notification registration works on both iOS and Android
  2. Fan receives contextual notifications: nearby events, badge unlocks, tier-ups, artist messages, friend joins, and weekly recaps
  3. Tapping any notification deep-links to the correct screen (artist profile, passport, badge detail, etc.)
  4. Fan can toggle each notification type on/off individually in settings
**Plans**: 2 plans

Plans:
- [ ] 22-01-PLAN.md -- Push token registration, deep-link handler, notification preferences settings screen
- [ ] 22-02-PLAN.md -- Server-side notification dispatch via Expo Push API for all notification types

### Phase 23: Polish + App Store Prep
**Goal**: App feels polished, handles edge cases gracefully, and is ready for TestFlight distribution
**Depends on**: Phase 17, Phase 18, Phase 19, Phase 20, Phase 21, Phase 22
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05, POLISH-06, POLISH-07, POLISH-08, POLISH-09, POLISH-10
**Success Criteria** (what must be TRUE):
  1. All data-dependent screens show skeleton loading states and network error states with retry buttons
  2. Passport and artist data are cached for offline viewing
  3. Collection confirmation, badge unlock, pull-to-refresh, and passport scroll all have custom animations with haptic feedback
  4. Empty states show illustrations (no collections yet, no badges yet, etc.)
  5. TestFlight build is distributable and App Store screenshots are generated for required device sizes
**Plans**: 3 plans

Plans:
- [ ] 23-01-PLAN.md -- Skeleton loaders, error states with retry, empty states with illustrations
- [ ] 23-02-PLAN.md -- Offline caching, enhanced animations with haptics, passport parallax, custom pull-to-refresh
- [ ] 23-03-PLAN.md -- TestFlight build config and App Store screenshot prep

## Progress

**Execution Order:**
Phase 16 (complete) -> Phases 17, 18, 19, 21, 22 (parallel after 16) -> Phase 20 (after 17) -> Phase 23 (after all)

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
| 9. Scene Map | v1.2 | 2/2 | Complete | 2026-03-06 |
| 10. Scraper Pipeline | v1.2 | 2/2 | Complete | 2026-03-07 |
| 11. Passport Visual Overhaul | v2.0 | 2/2 | Complete | 2026-03-07 |
| 12. Online Discovery | v2.0 | 3/3 | Complete | 2026-03-07 |
| 13. Badges and Gamification | v2.0 | 2/2 | Complete | 2026-03-07 |
| 14. Enhanced Artist Profiles | v2.0 | 3/3 | Complete | 2026-03-07 |
| 15. Passport Sharing and Social | v2.0 | 3/3 | Complete | 2026-03-07 |
| 16. Setup + Navigation + Auth | v3.0 | 1/1 | Complete | 2026-03-08 |
| 17. Home Feed + Artist Profiles + Collection | 3/3 | Complete    | 2026-03-08 | - |
| 18. Passport + Badges + Sharing | 3/3 | Complete    | 2026-03-09 | - |
| 19. Search + Add Artist + Share Extension | 3/3 | Complete    | 2026-03-09 | - |
| 20. Location-Based Collection | 3/3 | Complete    | 2026-03-09 | - |
| 21. Map + Leaderboard | 2/2 | Complete    | 2026-03-09 | - |
| 22. Push Notifications | 2/2 | Complete    | 2026-03-09 | - |
| 23. Polish + App Store Prep | 1/3 | In Progress|  | - |
