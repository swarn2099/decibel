# Phase 20: Location-Based Collection - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning
**Source:** PRD Express Path (decibel-mobile-prd.md)

<domain>
## Phase Boundary

This phase delivers the killer native feature: detecting when a fan is at a venue during a live event and prompting them to collect the performing artist(s). Includes location permission flow, foreground venue geofence detection, collection banner, multi-artist lineup support, "I'm at a show" manual trigger, and graceful degradation without location permission.

</domain>

<decisions>
## Implementation Decisions

### Location Permission Flow
- On first app open after onboarding: explain WHY location is needed before requesting
- Explanation text: "Decibel uses your location to know when you're at a show so you can collect artists automatically. We only check when you open the app."
- Request "While Using" permission (NOT "Always") — foreground only
- If denied: app works fine, just no auto-detection. Manual collect still works.
- Use expo-location for all location APIs

### Venue Detection (Foreground Only)
- When app comes to foreground, get current location
- Check against venues table: is the fan within any venue's geofence_radius?
- If yes: check events table: is there an active event at this venue right now?
- If yes: show non-intrusive banner at top of whatever screen they're on
- Banner format: "[Artist] is playing at [Venue] right now. Collect?"
- Tap "Collect" → verified collection recorded (capture_method = 'location')
- Tap "✕" → dismiss, don't show again for this event
- If multiple artists performing (lineup): show all with individual collect buttons

### "I'm at a show" Manual Trigger
- Button on Home screen: "I'm at a show"
- Tap → location check → show nearby venues with active events
- Fan selects the correct venue → shown the lineup → collects artists
- Fallback for when auto-detection doesn't trigger

### Graceful Degradation (Locked)
- App functions fully without location permission
- No punishing the user for saying no
- Manual collect via artist profile always works regardless of location permission
- "I'm at a show" button should handle the case where location is denied (show a message, don't crash)

### Morning-After Review (Deferred)
- PRD mentions detecting if fan was near a venue — but this requires storing last-known location
- Defer to Polish phase or future iteration — foreground detection is the MVP

### Claude's Discretion
- How to implement the foreground detection check (AppState listener vs useEffect on mount)
- Geofence radius matching algorithm (haversine distance vs simple lat/lng bounding box)
- How to dismiss/suppress banners for already-seen events (AsyncStorage vs Zustand)
- Whether to use a global overlay for the banner vs per-screen component
- How to query nearby venues efficiently (single Supabase query with distance filter)
- Animation/transition for the collection banner appearing
- Component organization for location-related features
- How to handle the case where multiple venues are within range simultaneously

</decisions>

<specifics>
## Specific Ideas

- "The killer native feature" — this is what makes the mobile app worth building
- Foreground-only location: "We only check when you open the app" — privacy-first messaging
- Banner should be non-intrusive — top of screen, doesn't block content
- Collection recorded as verified with capture_method = 'location'
- Uses existing collection flow from Phase 17 (useCollect/useDiscover hooks)
- Venue geofence_radius is stored per-venue in the venues table
- Events table has performer_id, venue_id, date, is_live fields
- Haptics: medium impact on location-based collect

</specifics>

<deferred>
## Deferred Ideas

- Morning-after review ("Looks like you were near [Venue] last night") — needs stored location history
- Background location tracking — explicitly out of scope for v3.0 (ADV-01)
- NFC tap collection — v4.0 (ADV-03)
- Geofence-triggered push notifications — Phase 22 (Push Notifications)

</deferred>

---

*Phase: 20-location-based-collection*
*Context gathered: 2026-03-09 via PRD Express Path*
