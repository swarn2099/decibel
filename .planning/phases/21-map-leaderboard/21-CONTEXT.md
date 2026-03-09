# Phase 21: Map + Leaderboard - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning
**Source:** PRD Express Path (decibel-mobile-prd.md)

<domain>
## Phase Boundary

This phase delivers two features for the Map and Passport tabs: (1) a full-screen dark-themed scene map with venue markers, genre filters, "Tonight" mode, and venue detail bottom sheets, and (2) a competitive leaderboard with fan/performer tabs, time filters, highlighted own position, and shareable rank images.

</domain>

<decisions>
## Implementation Decisions

### Scene Map
- Full-screen dark-themed map using react-native-maps with custom dark style
- Edge-to-edge map, no padding — tab bar overlays the bottom
- Venue markers colored by primary genre (house=pink, techno=blue, bass=teal) and sized by activity level (event frequency)
- Tap marker → bottom sheet with venue photo, name, tonight's lineup with artist photos, "Navigate" button
- Genre filter chips at top of map
- "Tonight" toggle — when active, non-active venues fade to 10% opacity, active venues pulse with breathing animation
- "Near Me" button — center map on user's location
- Tap artist in venue sheet → navigate to artist profile

### Map Visual Design (Locked from PRD)
- Custom dark map style — minimal road labels, muted colors, venue dots are the visual focus
- Venue dots: size varies by event frequency, color varies by primary genre
- "Tonight" toggle: non-active venues fade to 10% opacity, active venues pulse with breathing animation
- Bottom sheet slides up with venue photo, name, tonight's lineup with artist photos, "Navigate" button

### Leaderboard
- Tabs: Fans / Performers
- Time filter: Weekly / Monthly / All-Time
- Fan leaderboard: rank, name (NOT email), collection count, tier badge
- Performer leaderboard: rank, photo, name, fan count, genres
- "Your Position" highlighted in teal (#00D4AA)
- "Share Rank" button generates shareable image via web API
- Pull-to-refresh

### Claude's Discretion
- react-native-maps setup and configuration (provider, initial region)
- Custom dark map JSON style definition
- How to calculate venue "activity level" for marker sizing (event count in last 30 days?)
- Genre-to-color mapping strategy (stored per venue or derived from events?)
- Bottom sheet library choice (@gorhom/bottom-sheet already in use or new?)
- Leaderboard data query strategy (Supabase RPC function vs client-side aggregation)
- How to implement the pulsing/breathing animation on map markers
- Share rank image: reuse existing web API share card endpoints or new endpoint
- Where to place leaderboard in navigation (sub-screen of Passport? Separate route?)
- Pagination for leaderboard (top 100? Infinite scroll?)

</decisions>

<specifics>
## Specific Ideas

- Map should feel alive — venue markers that pulse, genre colors that pop against the dark map
- "Tonight" mode is the killer feature for the map — shows what's happening RIGHT NOW
- Fan leaderboard shows NAMES not emails — privacy first
- "Your Position" in teal makes it immediately findable
- The map tab is already in the tab bar from Phase 16 setup
- Use existing useLocation hook from Phase 20 for "Near Me" button
- Venues table has coordinates and geofence_radius
- Events table has performer_id, venue_id, date, is_live
- DO NOT use white backgrounds, even in bottom sheets
- DO NOT use generic map styles — must be custom dark

</specifics>

<deferred>
## Deferred Ideas

- Venue clustering at low zoom levels — nice-to-have for cities with many venues
- Heatmap overlay showing collection density — future feature
- Route navigation to venue (just open in Apple/Google Maps via "Navigate" button)
- Leaderboard notifications ("You moved up to #5!") — Phase 22 (Push Notifications)

</deferred>

---

*Phase: 21-map-leaderboard*
*Context gathered: 2026-03-09 via PRD Express Path*
