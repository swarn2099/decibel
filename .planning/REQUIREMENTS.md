# Requirements: Decibel Mobile

**Defined:** 2026-03-08
**Core Value:** Fans can scan a QR code at a live show and instantly collect that performer — no app install, no friction — building a verified attendance record with tiered access rewards.
**Source:** decibel-mobile-prd.md (PRD Express Path)

## v3.0 Requirements

Requirements for the React Native mobile app. Each maps to roadmap phases.

### Setup & Navigation (Phase 1 — COMPLETE)

- [x] **SETUP-01**: Expo project initialized with TypeScript, Expo Router, NativeWind, TanStack Query, Zustand
- [x] **SETUP-02**: EAS Build configured with development, preview, and production profiles
- [x] **SETUP-03**: Supabase client configured with same credentials as web app (shared DB)
- [x] **SETUP-04**: 5-tab navigation (Home, Search, Collect, Map, Passport) with correct icons and dark tab bar
- [x] **SETUP-05**: Auth flow with onboarding slides, magic link sign-in, session persistence via expo-secure-store
- [x] **SETUP-06**: Design system applied (dark background, Poppins font, brand color tokens, yellow active tab)

### Home Feed

- [x] **HOME-01**: Fan can view "Next Weekend" section showing upcoming events with venue, date, and artist photos
- [x] **HOME-02**: Fan can scroll "Chicago Residents" horizontal list of local artists
- [x] **HOME-03**: Fan can view "Recently Added" section showing newest artists in database
- [x] **HOME-04**: Fan can pull-to-refresh to reload home feed data
- [x] **HOME-05**: Fan sees "Add an Artist" CTA banner linking to add flow

### Artist Profiles

- [x] **PROF-01**: Fan can view artist profile with full-width hero photo, name, genres, city, fan count
- [x] **PROF-02**: Fan can tap social links (Spotify, SoundCloud, Instagram, RA) to open in respective app or browser
- [x] **PROF-03**: Fan can view top tracks/mixes section on artist profile
- [x] **PROF-04**: Fan can view upcoming shows on artist profile
- [x] **PROF-05**: Fan can see founder badge and similar artists on artist profile

### Collection Flow

- [x] **COLL-01**: Fan can tap "Collect" on artist profile to create a verified collection (with location check)
- [x] **COLL-02**: Fan can tap "Discover" on artist profile to add online discovery to passport
- [x] **COLL-03**: Fan sees confirmation animation (card slide-up with artist name, date, tier badge) after collecting
- [x] **COLL-04**: Fan is prompted to share after collecting (generates shareable card via API)

### Passport

- [x] **PASS-01**: Fan can view passport with header (name, city, member since, avatar), stats bar, and collection timeline
- [x] **PASS-02**: Collections display as stamps — verified are full-color with tier badge, discovered are muted with outline
- [x] **PASS-03**: Fan can tap an artist in collection to see tier progress ("3/5 scans to Secret tier")
- [x] **PASS-04**: Fan can view earned badges in a grid with icons, names, and earned dates
- [x] **PASS-05**: Fan can tap a locked/grayed badge to see what's needed to earn it
- [ ] **PASS-06**: Fan can generate and share passport summary card (1080x1920, server-side rendered)
- [ ] **PASS-07**: Fan can generate and share single-artist collection card
- [ ] **PASS-08**: Fan can generate and share badge achievement card
- [ ] **PASS-09**: Share sheet supports Instagram Stories, iMessage, copy link, save to camera roll
- [ ] **PASS-10**: Fan can copy their public passport link (decibel-three.vercel.app/u/[username])

### Search & Add Artist

- [ ] **SRCH-01**: Fan can search existing artists in Decibel database with autocomplete
- [ ] **SRCH-02**: Fan sees "Not here? Add them to Decibel" link when artist not found
- [ ] **SRCH-03**: Fan can search Spotify API for artists not in database
- [ ] **SRCH-04**: Artists under 1M monthly listeners show "Founder badge" CTA; over 1M show regular add
- [ ] **SRCH-05**: Fan sees loading animation during scraping pipeline ("Building profile...")
- [ ] **SRCH-06**: Fan sees celebration screen with founder badge animation when earning founder badge
- [ ] **SRCH-07**: Artist auto-added to fan's passport as discovered after adding

### Share Extension

- [ ] **SHARE-01**: Decibel registered as share target for URLs on iOS and Android
- [ ] **SHARE-02**: Sharing a Spotify/SoundCloud/Instagram link TO Decibel opens artist profile (if exists) or add flow (if new)

### Location-Based Collection

- [ ] **LOC-01**: Fan sees clear explanation of why location permission is needed before request
- [ ] **LOC-02**: App requests "While Using" location permission (NOT "Always")
- [ ] **LOC-03**: When app is in foreground, checks current location against venue geofences
- [ ] **LOC-04**: If fan is at a venue with an active event, non-intrusive banner appears: "[Artist] is playing at [Venue]. Collect?"
- [ ] **LOC-05**: Multiple-artist lineups show all artists with individual collect buttons
- [ ] **LOC-06**: "I'm at a show" manual trigger on Home screen as fallback for auto-detection
- [ ] **LOC-07**: App functions fully without location permission (graceful degradation)

### Scene Map

- [ ] **MAP-01**: Full-screen dark-themed map with custom dark style and venue markers
- [ ] **MAP-02**: Venue markers sized by activity level, colored by genre
- [ ] **MAP-03**: Fan can tap venue marker to see bottom sheet with venue name, upcoming events, top artists
- [ ] **MAP-04**: Fan can filter map by genre via chips at top
- [ ] **MAP-05**: "Tonight" toggle shows only active venues with pulsing markers
- [ ] **MAP-06**: "Near Me" button centers map on fan's location

### Leaderboard

- [ ] **LEAD-01**: Fan/Performer tabs with Weekly/Monthly/All-Time filters
- [ ] **LEAD-02**: Fan leaderboard shows rank, name, collection count, tier badge
- [ ] **LEAD-03**: Performer leaderboard shows rank, photo, name, fan count, genres
- [ ] **LEAD-04**: Fan's own position highlighted in teal
- [ ] **LEAD-05**: "Share Rank" button generates shareable image

### Push Notifications

- [ ] **NOTIF-01**: Push notification registration works on iOS and Android
- [ ] **NOTIF-02**: Fan receives "nearby event" notification when artist they've collected is playing nearby
- [ ] **NOTIF-03**: Fan receives "badge earned" notification on badge unlock
- [ ] **NOTIF-04**: Fan receives "tier up" notification on tier progression
- [ ] **NOTIF-05**: Fan receives "artist message" notification when a DJ messages fans
- [ ] **NOTIF-06**: Fan receives "friend joined" notification when a phone contact joins Decibel
- [ ] **NOTIF-07**: Fan receives weekly recap notification summarizing shows, collections, badges
- [ ] **NOTIF-08**: Tapping notification deep-links to correct screen
- [ ] **NOTIF-09**: Fan can toggle each notification type on/off in settings

### Polish & App Store

- [ ] **POLISH-01**: Skeleton loading screens on all data-dependent screens
- [ ] **POLISH-02**: Offline support with cached passport and artist data
- [ ] **POLISH-03**: Collection confirmation stamp animation with haptic feedback
- [ ] **POLISH-04**: Badge unlock starburst animation with haptic feedback
- [ ] **POLISH-05**: Passport parallax header scroll effect
- [ ] **POLISH-06**: Custom pull-to-refresh animation (Decibel logo pulse or sound wave)
- [ ] **POLISH-07**: Network error states with retry buttons on all screens
- [ ] **POLISH-08**: Empty states with illustrations (no collections yet, no badges yet)
- [ ] **POLISH-09**: TestFlight build distributable to beta testers
- [ ] **POLISH-10**: App Store screenshots (6.7" and 5.5") for passport, map, collection, leaderboard

## v4.0 Requirements (Deferred)

### Advanced Native Features

- **ADV-01**: Background location tracking for passive collection detection
- **ADV-02**: Apple Music OAuth integration for artist import
- **ADV-03**: NFC tap collection via expo-nfc
- **ADV-04**: Email receipt parsing (AXS, DICE, Eventbrite, Ticketmaster) for passport pre-population
- **ADV-05**: SMS OTP authentication as alternative to magic link

## Out of Scope

| Feature | Reason |
|---------|--------|
| Performer dashboard in mobile | Web-only for now, performers manage from desktop |
| Background location ("Always" permission) | Privacy concerns, foreground-only for v3.0 |
| Apple Music full integration | Stub UI only, full integration in v4.0 |
| Payments/credits | Product rule: fans are always free |
| Song requests / tipping | Anti-feature for underground scene |
| Light mode | "The underground doesn't have a light mode" — PRD |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 through SETUP-06 | Phase 16 | Complete |
| HOME-01 through HOME-05 | Phase 17 | Pending |
| PROF-01 through PROF-05 | Phase 17 | Pending |
| COLL-01 through COLL-04 | Phase 17 | Pending |
| PASS-01 through PASS-10 | Phase 18 | Pending |
| SRCH-01 through SRCH-07 | Phase 19 | Pending |
| SHARE-01, SHARE-02 | Phase 19 | Pending |
| LOC-01 through LOC-07 | Phase 20 | Pending |
| MAP-01 through MAP-06 | Phase 21 | Pending |
| LEAD-01 through LEAD-05 | Phase 21 | Pending |
| NOTIF-01 through NOTIF-09 | Phase 22 | Pending |
| POLISH-01 through POLISH-10 | Phase 23 | Pending |

**Coverage:**
- v3.0 requirements: 63 total (6 complete from Phase 1)
- Mapped to phases: 63
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-08*
*Source: decibel-mobile-prd.md (PRD Express Path)*
