# Phase 17: Home Feed + Artist Profiles + Collection - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning
**Source:** PRD Express Path (decibel-mobile-prd.md — Phase 2)

<domain>
## Phase Boundary

This phase delivers the core browsable experience in the mobile app: a home feed with upcoming events and featured artists, rich artist profile screens mirroring the web, and the collect/discover flows that let fans add artists to their passport from mobile.

</domain>

<decisions>
## Implementation Decisions

### Home Feed
- "Next Weekend" section showing upcoming events (same data as web — events table)
- Each event card: venue name, date, artist photos + names, tap to see event detail
- "Chicago Residents" horizontal scroll of local artists
- "Recently Added" section showing newest artists in the database
- Pull-to-refresh on entire home feed
- "Add an Artist" banner/CTA linking to add flow (Search tab)

### Artist Profile Screen
- Route: `/artist/[slug]` (Expo Router)
- Artist photo full-width hero with gradient fade to dark background
- Name, genres, city, fan count displayed
- "Collect" button (prominent, yellow) and "Discover" button (secondary)
- Social links (Spotify, SoundCloud, Instagram, RA) — tap opens in respective app or browser via Linking
- Top tracks/mixes section (SoundCloud embeds or Spotify links)
- Upcoming shows at a glance
- Founder badge display if someone founded this artist
- Similar artists row (horizontal scroll of circular photos)
- Stats row below hero: fans collected, shows played, genres — in a frosted glass card

### Collection Flow
- Tap "Collect" → location check (if permission granted), if at venue → verified collection
- Tap "Discover" → online discovery added to passport
- Confirmation animation: stamp press animation — artist photo and venue animate in like a stamp being pressed onto passport page, slight bounce, haptic thud, tier badge seals like hot wax
- If tier-up: extra celebration — wax seal cracks and reforms in new tier color with confetti
- Share prompt after collection (generates shareable card via existing web API)
- Auto-dismiss confirmation after 5 seconds if no interaction

### Claude's Discretion
- TanStack Query cache/stale strategies for home feed data
- Exact layout proportions and spacing
- Animation easing curves and durations
- How to handle artists with no photo (gradient with initial — per PRD)
- WebView vs native for SoundCloud/Spotify embeds
- Error states for failed API calls

</decisions>

<specifics>
## Specific Ideas

- Hero image: full-width, with gradient fade to dark background at bottom. If no photo, gradient with artist initial.
- "Collect" button: full-width, yellow, bottom of hero section. THE action on this screen.
- Stats row: frosted glass card (expo-blur)
- Upcoming shows: timeline format with venue dots and connecting lines
- Similar artists: horizontal scroll of circular artist photos
- Haptics: Medium impact on collect/discover. Heavy impact on tier-up.
- Collection confirmation: full-screen takeover with backdrop blur. Stamp press animation with haptic thud.

</specifics>

<deferred>
## Deferred Ideas

- Share extension (Phase 19)
- Location-based auto-detection banner (Phase 20)
- Morning-after review prompt (Phase 20)
- Skeleton loading states (Phase 23 — Polish)
- Offline caching of artist data (Phase 23 — Polish)

</deferred>

---

*Phase: 17-home-feed-profiles-collection*
*Context gathered: 2026-03-08 via PRD Express Path*
