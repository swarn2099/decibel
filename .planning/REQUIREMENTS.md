# Requirements: Decibel

**Defined:** 2026-03-06
**Core Value:** Fans scan a QR code at a live show and instantly collect that performer — no app install, no friction — building a verified attendance record with tiered access rewards.

## v1 Requirements

### Auth & Security

- [x] **AUTH-01**: Performer can sign in via Supabase magic link (email)
- [x] **AUTH-02**: Performer session persists across browser refresh
- [x] **AUTH-03**: Performer can log out from dashboard
- [x] **AUTH-04**: Dashboard routes are protected — unauthenticated users redirect to login
- [x] **AUTH-05**: Performer claim flow verifies session identity (fix `/api/claim` security hole)
- [x] **AUTH-06**: RLS policies added for collections, fan_tiers, and messages tables
- [x] **AUTH-07**: Fan can log in via magic link to view their profile

### Fan Capture

- [x] **CAPT-01**: Fan scans QR → lands on `/collect/[slug]` → enters email → collected in under 10 seconds
- [x] **CAPT-02**: Collection recorded in Supabase with correct performer, capture method
- [x] **CAPT-03**: Fan tier updates correctly (1st scan = network, 3rd = early_access, 5th = secret, 10th = inner_circle)
- [x] **CAPT-04**: Repeat scan by same email shows updated tier, not duplicate collection
- [x] **CAPT-05**: Collect page has OG meta tags for social sharing preview
- [x] **CAPT-06**: Email is normalized (lowercase, trimmed) before storage
- [x] **CAPT-07**: QR code endpoint (`/api/qr/[slug]`) generates high-contrast scannable codes (white bg, dark modules)

### Performer Dashboard

- [ ] **DASH-01**: Dashboard shows total fan count and fans by tier
- [ ] **DASH-02**: Dashboard shows recent scans (last 30 days) with date
- [ ] **DASH-03**: Dashboard has scan-over-time chart (last 90 days)
- [ ] **DASH-04**: Fan list is searchable and filterable by tier
- [ ] **DASH-05**: Performer can download their QR code as print-ready PNG
- [x] **DASH-06**: Performer can compose message — select target tier, write subject + body, preview
- [x] **DASH-07**: Messages are saved to database (delivery stubbed for v1, labeled as draft/preview)
- [ ] **DASH-08**: "Go Live" button marks performer as live at a venue (select from venue list)
- [ ] **DASH-09**: Performer can claim their pre-built profile from the dashboard
- [x] **DASH-10**: Dashboard has intentional empty states (not broken-looking when no fans yet)

### Fan Profile

- [x] **FAN-01**: Logged-in fan can view their collected artists in a grid/list
- [x] **FAN-02**: Each collected artist shows tier badge and scan count
- [x] **FAN-03**: Fan can view their scan history with dates
- [x] **FAN-04**: Fan profile page follows dark underground aesthetic

### Settings & Account

- [x] **SETT-01**: Fan can access settings page from their profile
- [x] **SETT-02**: Fan can update their display name
- [x] **SETT-03**: Both fans and performers can log out
- [x] **SETT-04**: Settings page follows dark underground aesthetic

### Polish & Demo Readiness

- [x] **DEMO-01**: All pages follow Decibel dark aesthetic (bg #0B0B0F, brand colors, Poppins)
- [x] **DEMO-02**: Tier colors are consistent: pink (network), purple (early_access), blue (secret), teal (inner_circle)
- [x] **DEMO-03**: Animations on collect page (button press, confirmation reveal) using motion
- [x] **DEMO-04**: Toast notifications for user actions (sonner)
- [x] **DEMO-05**: `npm run build` passes with zero errors

## v2 Requirements

### Notifications
- **NOTF-01**: Fan receives push notification when a collected performer goes live nearby
- **NOTF-02**: Fan receives email when unlocking a new tier

### Enhanced Capture
- **ECAP-01**: Location-based passive detection (requires mobile app)
- **ECAP-02**: NFC tap capture method
- **ECAP-03**: Fan passport pre-populates via email receipt parsing (AXS, DICE, Eventbrite)

### Messaging
- **MSG-01**: Real email delivery via SendGrid/Resend
- **MSG-02**: Message open/click tracking
- **MSG-03**: Rich text message composer

### Mobile
- **MOB-01**: React Native app with Expo
- **MOB-02**: Apple/Google Wallet pass for fan identity

## Out of Scope

| Feature | Reason |
|---------|--------|
| React Native mobile app | Not in current PRD phases, future milestone |
| SMS OTP auth | Adds complexity, magic link sufficient for v1 |
| Real email delivery (SendGrid) | Stubbed for v1, labeled as draft/preview |
| Payments/credits | Explicitly off per product rules |
| Song requests / tipping | Anti-features that would repel underground DJs |
| Supabase Realtime subscriptions | Nice-to-have, not blocking demo |
| Admin panel | Not needed for v1 demo |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| AUTH-07 | Phase 4 | Complete |
| CAPT-01 | Phase 2 | Complete |
| CAPT-02 | Phase 2 | Complete |
| CAPT-03 | Phase 2 | Complete |
| CAPT-04 | Phase 2 | Complete |
| CAPT-05 | Phase 2 | Complete |
| CAPT-06 | Phase 2 | Complete |
| CAPT-07 | Phase 2 | Complete |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| DASH-05 | Phase 3 | Pending |
| DASH-06 | Phase 3 | Complete |
| DASH-07 | Phase 3 | Complete |
| DASH-08 | Phase 3 | Pending |
| DASH-09 | Phase 3 | Pending |
| DASH-10 | Phase 3 | Complete |
| FAN-01 | Phase 4 | Complete |
| FAN-02 | Phase 4 | Complete |
| FAN-03 | Phase 4 | Complete |
| FAN-04 | Phase 4 | Complete |
| SETT-01 | Phase 4 | Complete |
| SETT-02 | Phase 4 | Complete |
| SETT-03 | Phase 4 | Complete |
| SETT-04 | Phase 4 | Complete |
| DEMO-01 | Phase 4 | Complete |
| DEMO-02 | Phase 4 | Complete |
| DEMO-03 | Phase 2 | Complete |
| DEMO-04 | Phase 2 | Complete |
| DEMO-05 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after initial definition*
