# Phase 19: Search + Add Artist + Share Extension - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning
**Source:** PRD Express Path (decibel-mobile-prd.md)

<domain>
## Phase Boundary

This phase delivers three connected features: (1) search existing Decibel artists with autocomplete, (2) add new artists via Spotify API search with founder badge logic, and (3) an OS-level share extension that lets fans share Spotify/SoundCloud/Instagram links TO Decibel from any app. Together these enable the "add from anywhere" flow.

</domain>

<decisions>
## Implementation Decisions

### Search Screen
- Search bar at top with autocomplete against Decibel database
- Results show artist photo, name, genres, fan count
- "Not here? Add them to Decibel" link at bottom of results when no match
- Route: Search tab (already exists from Phase 16 navigation)

### Add Artist Flow
- Search field queries Spotify API for artists not in database
- Results show: artist photo, name, genres, monthly listeners
- Monthly listener threshold: under 1,000,000 = "Add to Decibel — earn Founder badge" (gold CTA); over 1,000,000 = "Add to Decibel" (regular CTA, no founder badge)
- On add: loading animation ("Building profile...") while scraping pipeline runs server-side
- Success: celebration screen with founder badge animation (if eligible)
- Artist auto-added to fan's passport as discovered
- "Already on Decibel — founded by [name]" if artist exists
- Monthly listener count shown as a progress bar toward 1M threshold
- Under 1M: gold "Founder" badge preview shown next to the add button
- Loading state during scraping: animated sound wave with "Building profile..." text
- Success state: gold confetti burst, "You're the founder!" with badge animation

### Add Artist Visual Design (Locked from PRD)
- Search results from Spotify show in cards with album art, name, genres, monthly listener count
- DO NOT use default React Native components without styling
- DO NOT use white backgrounds anywhere
- DO NOT use generic placeholder images — use gradient with initial if no photo

### Share Extension (iOS + Android)
- Register Decibel as a share target for URLs
- When fan shares a Spotify/SoundCloud/Instagram link TO Decibel:
  - Parse the URL to extract artist info
  - If artist exists in Decibel: open artist profile
  - If artist doesn't exist: open add flow with artist pre-filled
- Enables "add from anywhere" flow without opening Decibel first

### Founder Badge Rules
- One founder badge per artist, ever
- First person to add an artist earns the founder badge
- Founder badge only available for artists under 1M monthly listeners
- Uses existing founder_badges table in Supabase

### Claude's Discretion
- Debounce strategy for search autocomplete (timing, minimum characters)
- Whether to use Supabase full-text search or ILIKE for artist search
- Spotify API authentication approach for mobile (client credentials vs user token)
- How to call the scraping pipeline from mobile (web API endpoint vs direct)
- Share extension implementation details (Expo Share Extension config)
- URL parsing regex/logic for Spotify/SoundCloud/Instagram links
- Component file organization within mobile/src/
- Navigation flow between search results → add flow → celebration
- How to handle Spotify API rate limits in the mobile context
- Confetti/celebration animation approach (Lottie vs Reanimated)

</decisions>

<specifics>
## Specific Ideas

- "Collection should feel like an achievement" — the founder badge celebration should be memorable
- Gold confetti burst + "You're the founder!" with badge animation on successful founder add
- Sound wave animation during "Building profile..." loading state
- Monthly listener progress bar toward 1M threshold — visual indicator of founder eligibility
- Haptics: medium impact on successful add, heavy impact on founder badge earn
- The web app already has scraping pipeline endpoints — reuse those
- Existing web API at decibel-three.vercel.app/api/ can handle add-artist server-side
- DO NOT use Inter, Roboto, SF Pro, or system fonts — Poppins only

</specifics>

<deferred>
## Deferred Ideas

- Apple Music integration for artist import — v4.0 (ADV-02)
- NFC tap collection — v4.0 (ADV-03)
- Background URL processing when share extension receives link while app is closed — can enhance in Polish phase
- Batch artist import (add multiple artists at once) — not in scope

</deferred>

---

*Phase: 19-search-add-artist-share-extension*
*Context gathered: 2026-03-09 via PRD Express Path*
