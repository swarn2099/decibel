# Requirements: Decibel v2.0 — The Passport

**Defined:** 2026-03-07
**Core Value:** The passport is the hero screen — every design decision should make someone want to screenshot their passport and share it.

## v2.0 Requirements

### Passport

- [x] **PASS-01**: Fan can view passport with chronological timeline of verified and discovered collections
- [x] **PASS-02**: Verified collections display with full color, solid badge, and tier indicator
- [x] **PASS-03**: Discovered collections display with muted style, outline badge, "discovered" tag
- [x] **PASS-04**: Fan can view "Your Year in Sound" stats (dancefloors, cities, artists, venues, streaks, favorite genre)
- [x] **PASS-05**: Fan can generate a 1080x1920 story-ready shareable passport card
- [x] **PASS-06**: Fan has a public passport URL (/passport/[fan-slug]) viewable without login
- [x] **PASS-07**: Public passport generates OG meta preview card with stats

### Discovery

- [x] **DISC-01**: Fan can paste a link (Spotify/SoundCloud/RA/Instagram/TikTok/YouTube) to add an artist as a discovery
- [x] **DISC-02**: If artist doesn't exist in DB, auto-scraping pipeline creates their profile
- [x] **DISC-03**: Fan can connect Spotify via OAuth and import top artists as discoveries
- [x] **DISC-04**: Matched Spotify artists with upcoming local shows surface a "collect in person" prompt
- [x] **DISC-05**: Fan sees "Artists you might like" recommendations based on collection + listening data
- [x] **DISC-06**: Apple Music stub UI ("Coming soon — connect Apple Music in the mobile app")

### Badges

- [x] **BADGE-01**: Discovery badges award (Trailblazer, First 100, First 10 Verified)
- [x] **BADGE-02**: Attendance badges award (Regular, Devotee, Inner Circle, Venue Local, Venue Legend)
- [x] **BADGE-03**: Exploration badges award (Genre Explorer, City Hopper, Night Owl, Scene Veteran, Centurion)
- [x] **BADGE-04**: Streak badges award (On Fire, Unstoppable, Year-Round)
- [x] **BADGE-05**: Social badges award (Tastemaker, Connector)
- [x] **BADGE-06**: Badges display on passport with icon, name, description, date earned, rarity tier
- [x] **BADGE-07**: Badge unlock triggers visual feedback (animation/toast)
- [x] **BADGE-08**: Badges retroactively awarded for existing collection data on feature launch

### Artist Profile

- [x] **PROF-01**: Artist profile shows top tracks/mixes, genres, bio, social links, photo
- [x] **PROF-02**: Artist profile shows upcoming and past shows with venue history
- [x] **PROF-03**: Artist profile shows fan stats (total collectors, discoverers, tier breakdown)
- [x] **PROF-04**: Artist profile shows similar artists based on genre overlap
- [x] **PROF-05**: Artist profile has Spotify embed/link alongside SoundCloud embed
- [x] **PROF-06**: "Discover" button adds artist as a discovery to fan's passport
- [x] **PROF-07**: "Collect" button shows next show info or QR context
- [x] **PROF-08**: Fan sees tier progress and journey state (discovered -> collecting -> inner circle)
- [x] **PROF-09**: Unclaimed profiles show "Claim this profile" with magic link verification flow

### Social

- [ ] **SOCL-01**: Fan can generate shareable cards (single-artist, milestone, badge, discovery, stats variants)
- [ ] **SOCL-02**: Activity feed shows friend collections, discoveries, badge unlocks
- [ ] **SOCL-03**: Fan can follow/unfollow other fans
- [ ] **SOCL-04**: Fan sees follower/following counts on passport
- [ ] **SOCL-05**: Privacy setting controls who sees activity (mutual followers / public / private)
- [ ] **SOCL-06**: "Someone you know joined" notification when phone contact signs up

## Future Requirements

### Mobile-Dependent
- **MOBILE-01**: Apple Music integration via MusicKit (requires iOS app)
- **MOBILE-02**: Location-based passive detection for auto-collection
- **MOBILE-03**: Push notifications via FCM for badge unlocks and friend activity
- **MOBILE-04**: Phone contact sync for "someone you know joined" notifications

## Out of Scope

| Feature | Reason |
|---------|--------|
| Payments/credits | Fans are always free — core product rule |
| Song requests / tipping | Anti-features for underground scene |
| SMS OTP auth | Deferred to mobile milestone |
| Email receipt parsing | Deferred to mobile milestone |
| Real-time chat between fans | High complexity, not core to passport value |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PASS-01 | Phase 11 | Complete |
| PASS-02 | Phase 11 | Complete |
| PASS-03 | Phase 11 | Complete |
| PASS-04 | Phase 11 | Complete |
| PASS-05 | Phase 11 | Complete |
| PASS-06 | Phase 11 | Complete |
| PASS-07 | Phase 11 | Complete |
| DISC-01 | Phase 12 | Complete |
| DISC-02 | Phase 12 | Complete |
| DISC-03 | Phase 12 | Complete |
| DISC-04 | Phase 12 | Complete |
| DISC-05 | Phase 12 | Complete |
| DISC-06 | Phase 12 | Complete |
| BADGE-01 | Phase 13 | Complete |
| BADGE-02 | Phase 13 | Complete |
| BADGE-03 | Phase 13 | Complete |
| BADGE-04 | Phase 13 | Complete |
| BADGE-05 | Phase 13 | Complete |
| BADGE-06 | Phase 13 | Complete |
| BADGE-07 | Phase 13 | Complete |
| BADGE-08 | Phase 13 | Complete |
| PROF-01 | Phase 14 | Complete |
| PROF-02 | Phase 14 | Complete |
| PROF-03 | Phase 14 | Complete |
| PROF-04 | Phase 14 | Complete |
| PROF-05 | Phase 14 | Complete |
| PROF-06 | Phase 14 | Complete |
| PROF-07 | Phase 14 | Complete |
| PROF-08 | Phase 14 | Complete |
| PROF-09 | Phase 14 | Complete |
| SOCL-01 | Phase 15 | Pending |
| SOCL-02 | Phase 15 | Pending |
| SOCL-03 | Phase 15 | Pending |
| SOCL-04 | Phase 15 | Pending |
| SOCL-05 | Phase 15 | Pending |
| SOCL-06 | Phase 15 | Pending |

**Coverage:**
- v2.0 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 after roadmap creation*
