# Roadmap: Decibel

## Milestones

- v1.0 MVP - Phases 1-4 (shipped 2026-03-06)
- v1.1 Growth Mechanics + Content Engine - Phases 5-7 (shipped 2026-03-06)
- v1.2 Polish, Map, and Pipeline Fixes - Phases 8-10 (shipped 2026-03-07)
- v2.0 The Passport - Phases 11-15 (in progress)

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

### v2.0 The Passport (In Progress)

**Milestone Goal:** Transform the fan passport into a rich, visual, shareable experience that fans screenshot and post -- the hero screen of the entire product.

- [x] **Phase 11: Passport Visual Overhaul** - Rich passport layout with timeline, stats dashboard, story-ready sharing, and public passport URL
- [x] **Phase 12: Online Discovery + Add From Anywhere** - Fan-driven artist discovery via links, Spotify import, and smart recommendations (completed 2026-03-07)
- [ ] **Phase 13: Badges and Gamification** - Badge system rewarding attendance, discovery, streaks, exploration, and social activity
- [ ] **Phase 14: Enhanced Artist Profiles** - Rich artist pages with tracks, fan stats, similar artists, and distinct Collect vs Discover flows
- [ ] **Phase 15: Passport Sharing and Social** - Shareable cards, activity feed, follow system, and social notifications

## Phase Details

### Phase 11: Passport Visual Overhaul
**Goal**: Fans have a beautiful, data-rich passport that they want to screenshot and share
**Depends on**: Nothing (first phase of v2.0; builds on existing /profile)
**Requirements**: PASS-01, PASS-02, PASS-03, PASS-04, PASS-05, PASS-06, PASS-07
**Success Criteria** (what must be TRUE):
  1. Fan can view their passport with a chronological timeline showing both verified and discovered collections, visually distinct from each other (verified = full color + solid badge + tier indicator; discovered = muted + outline badge + "discovered" tag)
  2. Fan can view a "Your Year in Sound" stats section showing dancefloors visited, cities, total artists, venues, attendance streaks, and favorite genre
  3. Fan can generate a 1080x1920 story-ready image of their passport and download or share it
  4. Anyone can visit /passport/[fan-slug] without logging in and see that fan's passport with proper OG meta preview card
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md -- Core passport page with timeline (verified vs discovered) and stats dashboard
- [x] 11-02-PLAN.md -- Public passport URL with OG meta + story-ready shareable card

### Phase 12: Online Discovery + Add From Anywhere
**Goal**: Fans can build their passport without waiting for live shows -- discover artists online from any music platform
**Depends on**: Phase 11 (passport must display discoveries)
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06
**Success Criteria** (what must be TRUE):
  1. Fan can paste a Spotify/SoundCloud/RA/Instagram/TikTok/YouTube link and add that artist as a discovery to their passport
  2. If an artist doesn't exist in the database, the system auto-creates their profile from the submitted link
  3. Fan can connect Spotify via OAuth and see their top artists imported as discoveries, with "collect in person" prompts for those with upcoming local shows
  4. Fan sees personalized "Artists you might like" recommendations on their passport based on collection and listening data
  5. Apple Music shows a "Coming soon -- connect Apple Music in the mobile app" stub UI
**Plans**: 3 plans

Plans:
- [ ] 12-01-PLAN.md -- Link-based artist discovery with auto-creation pipeline (paste any music link to discover)
- [ ] 12-02-PLAN.md -- Spotify OAuth import + Apple Music stub
- [ ] 12-03-PLAN.md -- Personalized artist recommendations engine

### Phase 13: Badges and Gamification
**Goal**: Fans earn and display badges that reward showing up, exploring, and being early -- making the passport feel alive and collectible
**Depends on**: Phase 11, Phase 12 (badges reference both verified collections and discoveries)
**Requirements**: BADGE-01, BADGE-02, BADGE-03, BADGE-04, BADGE-05, BADGE-06, BADGE-07, BADGE-08
**Success Criteria** (what must be TRUE):
  1. Fan earns badges across five categories (discovery, attendance, exploration, streak, social) based on their real collection and activity data
  2. Badges display on the passport with icon, name, description, date earned, and rarity tier
  3. When a badge is unlocked, the fan sees a visual animation or toast notification
  4. Existing fans receive retroactive badges based on their current collection data when the feature launches
**Plans**: 2 plans

Plans:
- [ ] 13-01-PLAN.md -- Badge types, definitions, evaluation engine, API endpoints, and retroactive backfill script
- [ ] 13-02-PLAN.md -- Badge showcase on passport with rarity styling and unlock animation

### Phase 14: Enhanced Artist Profiles
**Goal**: Artist profiles become rich destination pages that fans browse, discover from, and use to plan their next show
**Depends on**: Phase 12 (needs discover CTA and auto-scraping pipeline for new artists)
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08, PROF-09
**Success Criteria** (what must be TRUE):
  1. Artist profile shows top tracks/mixes, genres, bio, social links, photo, and a Spotify embed alongside the existing SoundCloud embed
  2. Artist profile shows upcoming and past shows with venue history, plus fan stats (total collectors, discoverers, tier breakdown) and similar artists based on genre overlap
  3. Fan can click "Discover" to add the artist to their passport or "Collect" to see next show info / QR context, with their tier progress and journey state visible (discovered -> collecting -> inner circle)
  4. Unclaimed profiles show a "Claim this profile" CTA with magic link verification flow
**Plans**: TBD

Plans:
- [ ] 14-01: TBD
- [ ] 14-02: TBD

### Phase 15: Passport Sharing and Social
**Goal**: Fans can share any moment from their passport and see what their friends are collecting -- the viral loop
**Depends on**: Phase 11, Phase 13 (shares badges and passport visuals)
**Requirements**: SOCL-01, SOCL-02, SOCL-03, SOCL-04, SOCL-05, SOCL-06
**Success Criteria** (what must be TRUE):
  1. Fan can generate shareable cards for single-artist, milestone, badge, discovery, and stats variants
  2. Fan can follow/unfollow other fans and see follower/following counts on their passport
  3. Fan sees an activity feed showing friend collections, discoveries, and badge unlocks
  4. Fan can control privacy (mutual followers / public / private) and receives a notification when a phone contact joins Decibel
**Plans**: TBD

Plans:
- [ ] 15-01: TBD
- [ ] 15-02: TBD

## Progress

**Execution Order:** 11 -> 12 -> 13 -> 14 -> 15
(Note: Phase 14 depends on 12 only; Phase 15 depends on 11+13. Phases 13 and 14 could theoretically run in parallel after 12 completes.)

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
| 11. Passport Visual Overhaul | v2.0 | Complete    | 2026-03-07 | 2026-03-07 |
| 12. Online Discovery | 3/3 | Complete    | 2026-03-07 | - |
| 13. Badges and Gamification | v2.0 | 0/2 | Not started | - |
| 14. Enhanced Artist Profiles | v2.0 | 0/? | Not started | - |
| 15. Passport Sharing and Social | v2.0 | 0/? | Not started | - |
