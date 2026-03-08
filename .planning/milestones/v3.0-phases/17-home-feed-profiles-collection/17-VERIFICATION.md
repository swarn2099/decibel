---
phase: 17-home-feed-profiles-collection
verified: 2026-03-08T23:55:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 17: Home Feed + Artist Profiles + Collection Verification Report

**Phase Goal:** Fan can browse the home feed, view rich artist profiles, and collect or discover artists from their phone
**Verified:** 2026-03-08T23:55:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Fan can scroll a home feed showing upcoming events with venue, date, and artist photos | VERIFIED | `app/(tabs)/index.tsx` renders EventCard list via useUpcomingEvents hook querying events joined with performers/venues from Supabase |
| 2 | Fan can scroll a horizontal list of Chicago resident artists | VERIFIED | `app/(tabs)/index.tsx` renders ArtistRow with useChicagoResidents data (is_chicago_resident=true, ordered by follower_count) |
| 3 | Fan can see recently added artists section | VERIFIED | `app/(tabs)/index.tsx` renders ArtistRow with useRecentlyAdded data (ordered by created_at desc) |
| 4 | Fan can pull-to-refresh to reload all home feed data | VERIFIED | ScrollView has RefreshControl that calls refetch() on all three hooks via Promise.all |
| 5 | Fan sees an 'Add an Artist' CTA banner that navigates to the Search tab | VERIFIED | AddArtistBanner navigates to `/(tabs)/search` on press |
| 6 | Fan can view artist profile with full-width hero photo, name, genres, city, and fan count | VERIFIED | `app/artist/[slug].tsx` renders ArtistHero (167 lines) with photo/gradient fallback, genre pills, city, fan count |
| 7 | Fan can tap social links to open Spotify, SoundCloud, Instagram, or RA in browser | VERIFIED | SocialLinks uses `Linking.openURL` for each platform, with Instagram handle cleaning |
| 8 | Fan can view top tracks/mixes and upcoming shows on artist profile | VERIFIED | TracksSection (88 lines) links to Spotify/SoundCloud; UpcomingShows (195 lines) renders timeline layout |
| 9 | Fan can see founder badge and similar artists on artist profile | VERIFIED | FounderBadge (74 lines) with crown icon; SimilarArtists (123 lines) horizontal FlatList with navigation |
| 10 | Fan can tap Collect/Discover on artist profile with confirmation animation | VERIFIED | CollectButton renders yellow Collect + bordered Discover; ConfirmationModal (459 lines) uses reanimated spring physics (damping:12, stiffness:180), ink ring, tier badge, confetti, haptic feedback, auto-dismiss at 5s |
| 11 | Fan is prompted to share after collecting with a shareable card | VERIFIED | SharePrompt tries web API card generation, falls back to native Share with text message |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/index.ts` | Performer, Venue, HomeFeedEvent types | VERIFIED | 61 lines, contains HomeFeedEvent with performer/venue joins, full Performer type matching DB schema |
| `src/hooks/useHomeFeed.ts` | 3 TanStack Query hooks | VERIFIED | 138 lines, exports useUpcomingEvents, useChicagoResidents, useRecentlyAdded with supabase.from queries |
| `app/(tabs)/index.tsx` | Home tab screen (min 80 lines) | VERIFIED | 129 lines, renders all sections with loading state, pull-to-refresh |
| `src/hooks/useArtistProfile.ts` | 5 TanStack Query hooks | VERIFIED | 170 lines, exports useArtistProfile, useArtistEvents, useArtistFanCount, useArtistFounder, useSimilarArtists |
| `app/artist/[slug].tsx` | Artist profile route (min 60 lines) | VERIFIED | 226 lines, renders all components, handles collect/discover state, loading/error states |
| `src/components/artist/ArtistHero.tsx` | Hero with gradient fade (min 30 lines) | VERIFIED | 167 lines |
| `src/hooks/useCollection.ts` | Collect and discover mutations | VERIFIED | 178 lines, exports useCollect, useDiscover, calculateTier, TIER_COLORS, TIER_LABELS |
| `src/components/collection/CollectButton.tsx` | Yellow collect + discover buttons (min 30 lines) | VERIFIED | 111 lines |
| `src/components/collection/ConfirmationModal.tsx` | Stamp animation modal (min 60 lines) | VERIFIED | 459 lines, uses useAnimatedStyle, withSpring, haptics, auto-dismiss |
| `src/components/collection/SharePrompt.tsx` | Share with card generation fallback | VERIFIED | 103 lines |
| `src/components/home/EventCard.tsx` | Event card component | VERIFIED | 103 lines |
| `src/components/home/ArtistRow.tsx` | Horizontal artist scroll | VERIFIED | 79 lines |
| `src/components/home/AddArtistBanner.tsx` | Add artist CTA | VERIFIED | 21 lines |
| `src/components/artist/StatsCard.tsx` | Frosted stats card | VERIFIED | 82 lines |
| `src/components/artist/SocialLinks.tsx` | Social link buttons | VERIFIED | 100 lines |
| `src/components/artist/TracksSection.tsx` | Listen buttons | VERIFIED | 88 lines |
| `src/components/artist/UpcomingShows.tsx` | Timeline shows | VERIFIED | 195 lines |
| `src/components/artist/FounderBadge.tsx` | Founder badge card | VERIFIED | 74 lines |
| `src/components/artist/SimilarArtists.tsx` | Similar artists scroll | VERIFIED | 123 lines |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(tabs)/index.tsx` | `src/hooks/useHomeFeed.ts` | TanStack Query hooks | WIRED | Imports and calls useUpcomingEvents, useChicagoResidents, useRecentlyAdded |
| `src/hooks/useHomeFeed.ts` | Supabase | supabase.from queries | WIRED | Queries events, performers tables with proper joins and filters |
| `app/(tabs)/index.tsx` | `/artist/[slug]` | router.push on artist card | WIRED | EventCard and ArtistRow both call `router.push(/artist/${slug})` |
| `app/artist/[slug].tsx` | `src/hooks/useArtistProfile.ts` | TanStack Query hooks | WIRED | Imports all 5 hooks, passes artist.id to dependent queries |
| `src/hooks/useArtistProfile.ts` | Supabase | supabase.from queries | WIRED | All 5 hooks query Supabase directly with proper join unwrapping |
| `src/components/artist/SocialLinks.tsx` | Linking | Linking.openURL | WIRED | Each social link calls Linking.openURL on press |
| `src/hooks/useCollection.ts` | Web API /api/collect | fetch POST | WIRED | Calls `https://decibel-three.vercel.app/api/collect` with performer_id and email |
| `src/hooks/useCollection.ts` | Supabase (discover) | supabase.from insert | WIRED | Direct insert into collections + founder_badges + fan_tiers upsert |
| `src/components/collection/ConfirmationModal.tsx` | react-native-reanimated | useAnimatedStyle + withSpring | WIRED | 6 animated styles with spring physics for stamp press, ink ring, tier badge, confetti |
| `app/artist/[slug].tsx` | CollectButton | rendered at bottom | WIRED | CollectButton imported and rendered with all callbacks wired |
| `app/_layout.tsx` | `artist/[slug]` | Stack.Screen registration | WIRED | Route registered with presentation: "card" and slide_from_right animation |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HOME-01 | 17-01 | View upcoming events with venue, date, artist photos | SATISFIED | useUpcomingEvents + EventCard with venue/time/photo |
| HOME-02 | 17-01 | Scroll Chicago Residents horizontal list | SATISFIED | useChicagoResidents + ArtistRow horizontal FlatList |
| HOME-03 | 17-01 | View Recently Added section | SATISFIED | useRecentlyAdded + ArtistRow |
| HOME-04 | 17-01 | Pull-to-refresh home feed | SATISFIED | RefreshControl with Promise.all refetch |
| HOME-05 | 17-01 | Add an Artist CTA banner | SATISFIED | AddArtistBanner navigates to search tab |
| PROF-01 | 17-02 | Artist profile with hero photo, name, genres, city, fan count | SATISFIED | ArtistHero with full-width photo, genre pills, city, fan count |
| PROF-02 | 17-02 | Social links open in app/browser | SATISFIED | SocialLinks with Linking.openURL for all platforms |
| PROF-03 | 17-02 | Top tracks/mixes section | SATISFIED | TracksSection with Spotify/SoundCloud listen buttons |
| PROF-04 | 17-02 | Upcoming shows on artist profile | SATISFIED | UpcomingShows with timeline layout, venue info, dates |
| PROF-05 | 17-02 | Founder badge and similar artists | SATISFIED | FounderBadge + SimilarArtists horizontal scroll |
| COLL-01 | 17-03 | Collect on artist profile (with location check) | SATISFIED | useCollect mutation calls web API; location check deferred to Phase 20 per plan |
| COLL-02 | 17-03 | Discover on artist profile | SATISFIED | useDiscover mutation with direct Supabase insert |
| COLL-03 | 17-03 | Confirmation animation with artist name, date, tier badge | SATISFIED | ConfirmationModal with stamp press animation, tier badge, haptics |
| COLL-04 | 17-03 | Share prompt after collecting | SATISFIED | SharePrompt with card generation API fallback to native share |

No orphaned requirements found -- all 14 requirement IDs from REQUIREMENTS.md Phase 17 mapping are covered by plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/types/index.ts` | 3 | Comment: "placeholder so imports work" | Info | Refers to the Database type stub, not the actual app types. Database type will be generated from Supabase schema later. No impact on functionality. |
| `app/(tabs)/passport.tsx` | 32 | Comment: "Content placeholder" | Info | Not in Phase 17 scope -- passport screen is Phase 18. |

No blockers or warnings found. All implementations are substantive.

### Human Verification Required

### 1. Home Feed Visual Layout

**Test:** Open the Home tab on a device/simulator
**Expected:** DECIBEL title in pink, upcoming events section with EventCards (photo, venue, time), two horizontal artist scroll rows, Add Artist banner at bottom
**Why human:** Visual layout, spacing, and dark theme rendering cannot be verified programmatically

### 2. Artist Profile Hero & Gradient

**Test:** Tap an artist from the home feed
**Expected:** Full-width hero photo with gradient fade to dark background, genre pills, city, fan count. For artists without photos, gradient circle with initial letter.
**Why human:** Hero image sizing, gradient overlay effect, and fallback avatar quality need visual confirmation

### 3. Stamp Press Animation

**Test:** Tap "Collect" on an artist profile (requires auth)
**Expected:** Full-screen modal with stamp slam-down animation (spring physics), ink ring expansion, tier badge seal-in, haptic feedback thud, auto-dismiss after 5 seconds
**Why human:** Animation timing, haptic feel, and visual quality of the stamp press effect need real device testing

### 4. Pull-to-Refresh

**Test:** Pull down on home feed
**Expected:** Pink refresh indicator appears, all three sections reload simultaneously
**Why human:** Refresh gesture feel and loading indicator visibility need device testing

### 5. Social Links Opening

**Test:** Tap social link icons on an artist profile
**Expected:** Each link opens in the correct app (Spotify, Instagram) or browser
**Why human:** Deep linking behavior varies by installed apps on device

---

_Verified: 2026-03-08T23:55:00Z_
_Verifier: Claude (gsd-verifier)_
