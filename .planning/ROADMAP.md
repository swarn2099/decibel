# Roadmap: Decibel

## Overview

Decibel's core product loop ships in four phases: lock down auth and security (everything depends on it), build the fan capture flow (the "aha moment" when a QR scan works), build the performer dashboard (the demo centerpiece and revenue-side value prop), then finish with fan profiles, settings, and polish for a complete demo-ready product. Auth-first because both sides depend on it. Capture before dashboard because the dashboard needs collection data to display.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Auth & Security** - Performer magic link auth, protected routes, RLS policies, claim flow lockdown
- [x] **Phase 2: Fan Capture** - QR scan to email collection with tier progression, repeat handling, and feedback UX (completed 2026-03-06)
- [x] **Phase 3: Performer Dashboard** - Fan analytics, scan charts, fan list, message composer, QR download, Go Live (completed 2026-03-06)
- [x] **Phase 4: Fan Profile + Polish** - Fan login, collection view, settings, logout, and demo-ready aesthetic pass (completed 2026-03-06)

## Phase Details

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
**Plans:** 1/2 plans executed

Plans:
- [ ] 01-01-PLAN.md — Security hardening: fix claim route, switch dashboard to admin client, add logout
- [ ] 01-02-PLAN.md — RLS policies for collections/fan_tiers/messages + human verification

### Phase 2: Fan Capture
**Goal**: A fan at a venue can scan a QR code, enter their email, and be collected with correct tier progression — the core product loop works end-to-end
**Depends on**: Phase 1
**Requirements**: CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06, CAPT-07, DEMO-03, DEMO-04
**Success Criteria** (what must be TRUE):
  1. Fan scans a performer's QR code, lands on /collect/[slug], enters email, and sees a confirmation with their tier — entire flow completes in under 10 seconds
  2. Same fan scanning the same performer again sees their updated tier and scan count, not a duplicate collection
  3. QR codes generated at /api/qr/[slug] are high-contrast (white background, dark modules) and scannable in low-light conditions
  4. Sharing a /collect/[slug] link on social media shows performer name, photo, and branded description via OG meta tags
  5. Collection confirmation includes animation feedback (button press, reveal) and toast notifications for actions
**Plans:** 2/2 plans complete

Plans:
- [ ] 02-01-PLAN.md — Install deps, fix QR colors, enhance OG meta with Twitter card
- [ ] 02-02-PLAN.md — Motion animations on collect button/reveal + sonner toast notifications

### Phase 3: Performer Dashboard
**Goal**: A claimed performer can view their fan analytics, manage their audience, compose messages, and control their live status — the demo centerpiece
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, DASH-10
**Success Criteria** (what must be TRUE):
  1. Performer sees total fan count, fans-by-tier breakdown, and recent scans on dashboard load
  2. Performer can search their fan list by name/email and filter by tier level
  3. Performer can view a scan-over-time chart showing the last 90 days of collection activity
  4. Performer can compose a message (select tier, write subject + body, preview it) and save it to the database as a draft
  5. Performer can download their QR code as a print-ready PNG and toggle "Go Live" at a selected venue
**Plans:** 2/2 plans complete

Plans:
- [ ] 03-01-PLAN.md — Add Secret tier stat card + Go Live toast notifications
- [ ] 03-02-PLAN.md — Message draft/preview labeling + empty state polish + build verification

### Phase 4: Fan Profile + Polish
**Goal**: Fans can log in, view their collection and scan history, manage their account, and the entire app is demo-ready with consistent branding
**Depends on**: Phase 1
**Requirements**: AUTH-07, FAN-01, FAN-02, FAN-03, FAN-04, SETT-01, SETT-02, SETT-03, SETT-04, DEMO-01, DEMO-02, DEMO-05
**Success Criteria** (what must be TRUE):
  1. Fan can log in via magic link and see a grid of their collected artists, each showing tier badge and scan count
  2. Fan can view their full scan history with dates across all performers
  3. Fan can access settings, update their display name, and log out
  4. Every page in the app uses Decibel dark aesthetic (bg #0B0B0F, brand colors, Poppins font) with consistent tier colors (pink/purple/blue/teal)
  5. `npm run build` passes with zero errors
**Plans:** 2/2 plans complete

Plans:
- [ ] 04-01-PLAN.md — Shared tier constants, auth flow updates, fan profile page with collection grid and scan history
- [ ] 04-02-PLAN.md — Settings page with display name update, logout, aesthetic audit, and build verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth & Security | 1/2 | In Progress|  |
| 2. Fan Capture | 2/2 | Complete   | 2026-03-06 |
| 3. Performer Dashboard | 2/2 | Complete   | 2026-03-06 |
| 4. Fan Profile + Polish | 2/2 | Complete   | 2026-03-06 |
