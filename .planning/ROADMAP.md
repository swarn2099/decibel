# Roadmap: Decibel

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-03-06)
- 🚧 **v1.1 Growth Mechanics + Content Engine** - Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) - SHIPPED 2026-03-06</summary>

### Phase 1: Auth & Security
**Goal**: Performers can securely authenticate and access protected routes; the database enforces row-level access control
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. Performer can enter their email on /auth/login, receive a magic link, click it, and land on /dashboard
  2. Performer's session survives a full browser refresh on /dashboard without redirecting to login
  3. Unauthenticated user visiting /dashboard is redirected to /auth/login
  4. Performer can only claim a profile that matches their authenticated email — claiming another performer's profile fails
  5. Database queries scoped by RLS return only rows the authenticated user owns (collections, fan_tiers, messages)
**Plans**: 2 plans

Plans:
- [x] 01-01: Security hardening: fix claim route, switch dashboard to admin client, add logout
- [x] 01-02: RLS policies for collections/fan_tiers/messages + human verification

### Phase 2: Fan Capture
**Goal**: A fan at a venue can scan a QR code, enter their email, and be collected with correct tier progression
**Depends on**: Phase 1
**Requirements**: CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06, CAPT-07, DEMO-03, DEMO-04
**Success Criteria** (what must be TRUE):
  1. Fan scans a performer's QR code, lands on /collect/[slug], enters email, and sees a confirmation with their tier
  2. Same fan scanning the same performer again sees their updated tier and scan count, not a duplicate collection
  3. QR codes generated at /api/qr/[slug] are high-contrast and scannable in low-light conditions
  4. Sharing a /collect/[slug] link on social media shows performer name, photo, and branded description via OG meta tags
  5. Collection confirmation includes animation feedback and toast notifications
**Plans**: 2 plans

Plans:
- [x] 02-01: Install deps, fix QR colors, enhance OG meta with Twitter card
- [x] 02-02: Motion animations on collect button/reveal + sonner toast notifications

### Phase 3: Performer Dashboard
**Goal**: A claimed performer can view their fan analytics, manage their audience, compose messages, and control their live status
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, DASH-10
**Success Criteria** (what must be TRUE):
  1. Performer sees total fan count, fans-by-tier breakdown, and recent scans on dashboard load
  2. Performer can search their fan list by name/email and filter by tier level
  3. Performer can view a scan-over-time chart showing the last 90 days of collection activity
  4. Performer can compose a message and save it to the database as a draft
  5. Performer can download their QR code as a print-ready PNG and toggle "Go Live" at a selected venue
**Plans**: 2 plans

Plans:
- [x] 03-01: Add Secret tier stat card + Go Live toast notifications
- [x] 03-02: Message draft/preview labeling + empty state polish + build verification

### Phase 4: Fan Profile + Polish
**Goal**: Fans can log in, view their collection and scan history, manage their account, and the entire app is demo-ready
**Depends on**: Phase 1
**Requirements**: AUTH-07, FAN-01, FAN-02, FAN-03, FAN-04, SETT-01, SETT-02, SETT-03, SETT-04, DEMO-01, DEMO-02, DEMO-05
**Success Criteria** (what must be TRUE):
  1. Fan can log in via magic link and see a grid of their collected artists with tier badges and scan count
  2. Fan can view their full scan history with dates across all performers
  3. Fan can access settings, update their display name, and log out
  4. Every page uses Decibel dark aesthetic with consistent tier colors
  5. `npm run build` passes with zero errors
**Plans**: 2 plans

Plans:
- [x] 04-01: Shared tier constants, auth flow updates, fan profile page
- [x] 04-02: Settings page, logout, aesthetic audit, build verification

</details>

### v1.1 Growth Mechanics + Content Engine (In Progress)

**Milestone Goal:** Add viral sharing, gamification, and automated content generation to drive organic growth.

**Phase Numbering:**
- Integer phases (5, 6, 7): Planned milestone work
- Decimal phases (5.1, 5.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 5: Shareable Collection Cards** - Fans can share branded collection cards on social media
- [ ] **Phase 6: City Leaderboard** - Public leaderboard gamifies fan attendance and performer popularity
- [ ] **Phase 7: Content Generator** - Automated Instagram content pipeline from scraped data

## Phase Details

### Phase 5: Shareable Collection Cards
**Goal**: Fans can share a branded visual card of their collected artists on social media, driving viral loops
**Depends on**: Phase 4 (fan auth + profile)
**Requirements**: SHARE-01, SHARE-02, SHARE-03, SHARE-04
**Success Criteria** (what must be TRUE):
  1. Fan can visit `/fan/[id]/card` and see a branded card showing their collected artists with tier badges and total count
  2. Sharing the card URL on Twitter/Instagram/iMessage renders a correct 1200x630 OG image preview with artist photos in a grid layout
  3. Card visually matches Decibel dark aesthetic (dark bg, brand accent colors, Poppins font)
  4. Fan can copy and share the card URL and social preview renders correctly on at least two major platforms
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Card page + dynamic OG image generation
- [ ] 05-02-PLAN.md — Share button UX + social preview verification

### Phase 6: City Leaderboard
**Goal**: Fans and performers compete on a public leaderboard that gamifies attendance and builds community
**Depends on**: Phase 5 (shared fan/performer data display patterns)
**Requirements**: LEAD-01, LEAD-02, LEAD-03, LEAD-04
**Success Criteria** (what must be TRUE):
  1. Visitor can view `/leaderboard` and see top fans ranked by collection count
  2. Visitor can see top performers ranked by fan count on the same page
  3. User can toggle between weekly, monthly, and all-time time filters and rankings update accordingly
  4. Leaderboard page uses Decibel dark aesthetic with gamification feel (ranks, visual hierarchy, tier colors)
**Plans**: 1 plan

Plans:
- [ ] 06-01-PLAN.md — Leaderboard page with podium layout, fan/performer tabs, time filtering

### Phase 7: Content Generator
**Goal**: Automated pipeline produces ready-to-post Instagram content from scraped performer and event data
**Depends on**: Nothing (independent of Phases 5-6, uses existing DB data and scraper output)
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06
**Success Criteria** (what must be TRUE):
  1. Running the DJ Spotlight script produces a 1080x1080 PNG card with performer photo, stats, and genres plus a companion caption .txt file
  2. Running the Scene Roundup script produces a 1080x1080 PNG weekly recap card from real scraped event data plus a caption .txt file
  3. Running the Product Teaser script produces a 1080x1080 PNG phone mockup card plus a caption .txt file
  4. Running the weekly batch generator produces 5-7 posts (mix of 2-3 spotlights, 1 roundup, 1-2 teasers) in a single output directory
  5. All image generation uses React components rendered to PNG via Playwright screenshot
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 -> 6 -> 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Auth & Security | v1.0 | 2/2 | Complete | 2026-03-06 |
| 2. Fan Capture | v1.0 | 2/2 | Complete | 2026-03-06 |
| 3. Performer Dashboard | v1.0 | 2/2 | Complete | 2026-03-06 |
| 4. Fan Profile + Polish | v1.0 | 2/2 | Complete | 2026-03-06 |
| 5. Shareable Collection Cards | 1/2 | In Progress|  | - |
| 6. City Leaderboard | v1.1 | 0/1 | Not started | - |
| 7. Content Generator | v1.1 | 0/? | Not started | - |
