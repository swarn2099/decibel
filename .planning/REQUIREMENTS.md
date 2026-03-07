# Requirements: Decibel

**Defined:** 2026-03-06
**Core Value:** Fans scan a QR code at a live show and instantly collect that performer — no app install, no friction — building a verified attendance record with tiered access rewards.

## v1.2 Requirements

Requirements for v1.2 Polish, Map, and Pipeline Fixes. Each maps to roadmap phases.

### Bug Fixes

- [x] **BUG-01**: Artist profile Instagram links display correctly (username, not double-URL)
- [x] **BUG-02**: Fan count shows "0 fans" label or hides when zero (no bare "0")
- [x] **BUG-03**: Empty sections (Tracks, etc.) are hidden when no data exists
- [x] **BUG-04**: Leaderboard displays fan display names instead of raw emails
- [x] **BUG-05**: Leaderboard tier badges use brand colors (pink/purple/blue/teal)
- [x] **BUG-06**: "Collect" button is dominant CTA (larger, full-width on mobile, branded color)

### Scene Map

- [x] **MAP-01**: Interactive map page at /map with dark theme styling
- [x] **MAP-02**: Every venue rendered as a dot sized/colored by activity level
- [x] **MAP-03**: Tapping a venue shows popup with name, upcoming shows, top performers
- [x] **MAP-04**: Genre filter allows filtering venues by genre (house, techno, bass, etc.)
- [x] **MAP-05**: "Tonight" mode shows only venues with events today with pulsing animation
- [x] **MAP-06**: Map is fully mobile responsive

### Scraper Pipeline

- [x] **SCRP-01**: Event-name-as-artist entries are identified and cleaned from DB
- [x] **SCRP-02**: Instagram handles stored as usernames (not full URLs) across all scrapers
- [x] **SCRP-03**: Scraper added for additional Chicago venues not yet covered

## Future Requirements

### Mobile App
- **MOB-01**: React Native app with location-based passive detection
- **MOB-02**: Push notifications for nearby events
- **MOB-03**: Email receipt parsing for ticket history

### Messaging
- **MSG-01**: Real SendGrid email delivery for performer messages
- **MSG-02**: SMS OTP auth for performers

## Out of Scope

| Feature | Reason |
|---------|--------|
| Payments/credits | Fans are always free — core product rule |
| Song requests / tipping | Anti-features for underground scene |
| React Native mobile app | Future milestone |
| Real-time fan count (Supabase Realtime) | Nice-to-have, not needed yet |
| Performer analytics dashboard v2 | Current dashboard sufficient for now |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 8 | Complete |
| BUG-02 | Phase 8 | Complete |
| BUG-03 | Phase 8 | Complete |
| BUG-04 | Phase 8 | Complete |
| BUG-05 | Phase 8 | Complete |
| BUG-06 | Phase 8 | Complete |
| MAP-01 | Phase 9 | Complete |
| MAP-02 | Phase 9 | Complete |
| MAP-03 | Phase 9 | Complete |
| MAP-04 | Phase 9 | Complete |
| MAP-05 | Phase 9 | Complete |
| MAP-06 | Phase 9 | Complete |
| SCRP-01 | Phase 10 | Complete |
| SCRP-02 | Phase 10 | Complete |
| SCRP-03 | Phase 10 | Complete |

**Coverage:**
- v1.2 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after initial definition*
