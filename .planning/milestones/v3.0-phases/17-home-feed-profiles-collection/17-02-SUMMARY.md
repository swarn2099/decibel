---
phase: 17-home-feed-profiles-collection
plan: 02
subsystem: ui
tags: [react-native, expo, tanstack-query, supabase, expo-image, expo-blur, expo-linear-gradient]

requires:
  - phase: 16-setup-nav-auth
    provides: "Expo project, tab navigation, auth flow, design tokens, Supabase client"
provides:
  - "Artist profile screen at /artist/[slug] with full data display"
  - "TanStack Query hooks for all artist data (profile, events, fans, founder, similar)"
  - "7 reusable artist UI components (hero, stats, social, tracks, shows, founder, similar)"
affects: [17-03-collection-flow, 18-passport-badges, 19-search-add-artist]

tech-stack:
  added: []
  patterns: [supabase-join-unwrapping, deterministic-gradient-from-name, timeline-layout]

key-files:
  created:
    - "app/artist/[slug].tsx"
    - "src/hooks/useArtistProfile.ts"
    - "src/components/artist/ArtistHero.tsx"
    - "src/components/artist/StatsCard.tsx"
    - "src/components/artist/SocialLinks.tsx"
    - "src/components/artist/TracksSection.tsx"
    - "src/components/artist/UpcomingShows.tsx"
    - "src/components/artist/FounderBadge.tsx"
    - "src/components/artist/SimilarArtists.tsx"
  modified:
    - "app/_layout.tsx"

key-decisions:
  - "Direct Supabase queries instead of web API routes for all artist data"
  - "BlurView for stats card with border fallback styling"
  - "Linking.openURL for all external links (no WebView embeds)"
  - "Deterministic gradient pairs from artist name hash for consistent fallback avatars"

patterns-established:
  - "Supabase join unwrapping: Array.isArray check for foreign key joins"
  - "Gradient avatar fallback: hash name to pick from 6 brand color pairs"
  - "Section-level null rendering: components return null when no data, screen always renders"

requirements-completed: [PROF-01, PROF-02, PROF-03, PROF-04, PROF-05]

duration: 4min
completed: 2026-03-08
---

# Phase 17 Plan 02: Artist Profile Summary

**Rich artist profile screen with hero photo, frosted stats card, social links, timeline shows, founder badge, and similar artists horizontal scroll**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T23:38:32Z
- **Completed:** 2026-03-08T23:42:23Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Artist profile screen renders all data sections from Supabase via 5 TanStack Query hooks
- Full-width hero with gradient overlay and fallback gradient-initial for artists without photos
- Social links open Spotify, SoundCloud, Instagram, Mixcloud, and RA via Linking.openURL
- Timeline-format upcoming shows with date blocks, venue dots, and connecting lines
- Frosted glass stats card using expo-blur BlurView
- Founder badge with crown icon and yellow-tinted card
- Similar artists horizontal FlatList with navigation to other artist profiles

## Task Commits

Each task was committed atomically:

1. **Task 1: Create artist profile hooks and route** - `0f5a862` (feat)
2. **Task 2: Build artist profile UI components** - `846e7c8` (feat)

## Files Created/Modified
- `app/artist/[slug].tsx` - Artist profile screen route with loading/error states and back navigation
- `app/_layout.tsx` - Added artist/[slug] Stack.Screen with slide_from_right animation
- `src/hooks/useArtistProfile.ts` - 5 TanStack Query hooks querying Supabase directly
- `src/components/artist/ArtistHero.tsx` - Full-width hero with gradient fade, genre pills, city/fan count
- `src/components/artist/StatsCard.tsx` - Frosted glass 3-column stats (fans, shows, genres)
- `src/components/artist/SocialLinks.tsx` - Social platform icon buttons with Linking.openURL
- `src/components/artist/TracksSection.tsx` - Listen buttons for Spotify/SoundCloud
- `src/components/artist/UpcomingShows.tsx` - Timeline layout with date blocks and venue info
- `src/components/artist/FounderBadge.tsx` - Yellow founder card with crown icon and avatar
- `src/components/artist/SimilarArtists.tsx` - Horizontal FlatList of circular artist avatars

## Decisions Made
- Used direct Supabase queries (not web API routes) since mobile shares the same DB
- BlurView for stats card with border styling for visual consistency
- Linking.openURL for all external links -- no heavy WebView embeds on profile
- Deterministic gradient from name hash ensures same artist always gets same fallback colors
- Instagram handle cleaning strips URLs, domains, and @ prefixes before building link

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Artist profile screen ready for Plan 03 to add Collect/Discover buttons at bottom
- pb-128 padding already reserved at ScrollView bottom for action buttons
- All hooks exported and available for reuse in collection flow

---
*Phase: 17-home-feed-profiles-collection*
*Completed: 2026-03-08*
