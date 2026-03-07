---
phase: 12-online-discovery-add-from-anywhere
verified: 2026-03-07T04:30:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 12: Online Discovery + Add From Anywhere Verification Report

**Phase Goal:** Fans can build their passport without waiting for live shows -- discover artists online from any music platform
**Verified:** 2026-03-07T04:30:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Fan can paste a Spotify/SoundCloud/RA/Instagram/TikTok/YouTube link and add that artist as a discovery | VERIFIED | `resolve-link/route.ts` has regex patterns for all 6 platforms (lines 11-21), SoundCloud uses widget API for rich metadata, `discover-modal.tsx` has full 3-step flow (input/confirm/success) with fetch calls to both endpoints |
| 2 | If artist doesn't exist in DB, system auto-creates their profile | VERIFIED | `discover/route.ts` `createPerformer()` (lines 22-57) generates slug, checks uniqueness, inserts into performers table with `claimed: false`. Same pattern in `spotify/import/route.ts` (lines 121-149) |
| 3 | Fan can connect Spotify via OAuth and see top artists imported as discoveries | VERIFIED | Full OAuth flow: `auth/route.ts` redirects to Spotify with `user-top-read` scope, `callback/route.ts` exchanges code for token stored in httpOnly cookie, `import/route.ts` fetches top 20 artists and creates collections with `capture_method: "online"`. UI auto-triggers import on redirect via `?spotify=connected` param |
| 4 | Fan sees personalized "Artists you might like" recommendations based on collection data | VERIFIED | `recommendations/route.ts` builds genre frequency map from collected artists, queries performers with `.overlaps()` on genre array, excludes already-collected, prioritizes artists with upcoming events, falls back to popular performers. `recommendations.tsx` renders horizontal scroll carousel with Discover buttons |
| 5 | Apple Music shows a "Coming soon" stub UI | VERIFIED | `spotify-import.tsx` lines 221-245: disabled "Soon" button, gradient from #FA233B to #FB5C74, text "Coming soon -- connect in the mobile app" |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/types/discovery.ts` | Discovery types | VERIFIED | 43 lines, exports SupportedPlatform, ResolvedArtist, DiscoverRequest, DiscoverResponse, LinkResolveResponse |
| `src/app/api/discover/resolve-link/route.ts` | POST link resolver | VERIFIED | 192 lines, parses 6 platform URLs, resolves SoundCloud via widget API, checks DB for existing performers |
| `src/app/api/discover/route.ts` | POST discovery creator | VERIFIED | 184 lines, creates collection with capture_method="online"/verified=false, auto-creates performer, handles duplicate constraint |
| `src/app/passport/discover-modal.tsx` | Modal UI for link paste | VERIFIED | 345 lines, 3-step modal (input/confirm/success), artist photo preview, platform badge, "Already in Decibel" tag |
| `src/app/api/spotify/auth/route.ts` | GET Spotify OAuth redirect | VERIFIED | 32 lines, redirects to Spotify with user-top-read scope and user ID as state |
| `src/app/api/spotify/callback/route.ts` | GET callback handler | VERIFIED | 60 lines, exchanges code for token, stores in httpOnly cookie (1hr expiry), redirects to /passport?spotify=connected |
| `src/app/api/spotify/import/route.ts` | POST top artists importer | VERIFIED | 215 lines, fetches top 20 artists, matches/creates performers, creates collections, checks upcoming events, deletes cookie after use |
| `src/app/passport/spotify-import.tsx` | Spotify connect UI + Apple Music stub | VERIFIED | 247 lines, idle/importing/done/error states, Spotify green button, import results grid with "Live [date]" badges, Apple Music disabled stub |
| `src/app/api/passport/recommendations/route.ts` | GET recommendations API | VERIFIED | 201 lines, genre frequency map, overlaps query, upcoming event prioritization, fallback to popular, match_reason generation |
| `src/app/passport/recommendations.tsx` | Recommendations carousel | VERIFIED | 258 lines, horizontal snap-scroll carousel, skeleton loading, Discover button with fade animation, toast notifications, empty state |
| `src/app/passport/passport-client.tsx` | Updated passport page | VERIFIED | 663 lines, imports DiscoverModal + SpotifyImport + Recommendations, "Discover an Artist" button, Music Connections section, Spotify error toast, all gated behind `!isPublic` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| discover-modal.tsx | /api/discover/resolve-link | fetch POST with { url } | WIRED | Line 66: `fetch("/api/discover/resolve-link", { method: "POST", ... body: JSON.stringify({ url }) })` |
| discover-modal.tsx | /api/discover | fetch POST with { performer_id } or { resolved_artist } | WIRED | Lines 97-101: `fetch("/api/discover", { method: "POST", ... body: JSON.stringify(body) })` |
| discover/route.ts | supabase performers + collections | upsert performer, insert collection | WIRED | Lines 39-53 (insert performer), lines 149-158 (insert collection with capture_method="online", verified=false) |
| spotify-import.tsx | /api/spotify/auth | window.location redirect | WIRED | Line 113: `window.location.href = "/api/spotify/auth"` |
| spotify/callback/route.ts | /passport?spotify=connected | redirect after token exchange | WIRED | Line 45-46: `NextResponse.redirect(new URL("/passport?spotify=connected", siteUrl))` |
| spotify/import/route.ts | performers + collections tables | DB insert for each artist | WIRED | Lines 133-143 (insert performer), lines 153-160 (insert collection) |
| recommendations.tsx | /api/passport/recommendations | fetch GET on mount | WIRED | Line 177: `fetch("/api/passport/recommendations")` |
| recommendations.tsx | /api/discover | fetch POST to add artist | WIRED | Lines 66-70: `fetch("/api/discover", { method: "POST", ... body: JSON.stringify({ performer_id }) })` |
| passport-client.tsx | DiscoverModal | import + render | WIRED | Line 33: import, line 652: `<DiscoverModal ... />` |
| passport-client.tsx | SpotifyImport | import + render | WIRED | Line 34: import, line 591: `<SpotifyImport onImportComplete={() => router.refresh()} />` |
| passport-client.tsx | Recommendations | import + render | WIRED | Line 35: import, line 583: `<Recommendations />` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DISC-01 | 12-01 | Fan can paste a link to add an artist as discovery | SATISFIED | resolve-link API + discover API + discover-modal UI |
| DISC-02 | 12-01 | Auto-scraping pipeline creates profile for unknown artists | SATISFIED | createPerformer() in discover/route.ts and spotify/import/route.ts |
| DISC-03 | 12-02 | Fan can connect Spotify via OAuth and import top artists | SATISFIED | Full OAuth flow (auth -> callback -> import) with SpotifyImport UI |
| DISC-04 | 12-02 | Matched artists with upcoming shows surface "collect in person" prompt | SATISFIED | import/route.ts queries events table, UI shows "Live [date]" badge |
| DISC-05 | 12-03 | Personalized "Artists you might like" recommendations | SATISFIED | Genre-based recommendations API + carousel UI with Discover buttons |
| DISC-06 | 12-02 | Apple Music stub UI | SATISFIED | Disabled button with gradient styling, "Coming soon -- connect in the mobile app" |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No blocking anti-patterns found |

TypeScript compilation: clean (no errors). All 6 commits verified in git history. The "coming soon" text in spotify-import.tsx is the intentional Apple Music stub per DISC-06, not an incomplete implementation.

### Human Verification Required

### 1. Link Resolve End-to-End

**Test:** Paste a SoundCloud artist link (e.g., soundcloud.com/bonobo) into the discover modal
**Expected:** Artist name and photo resolve via widget API, showing confirm step with "Already in Decibel" if the artist exists in DB
**Why human:** Cannot verify SoundCloud widget API response and visual rendering programmatically

### 2. Spotify OAuth Flow

**Test:** Click "Connect Spotify" on passport, authorize the app, verify import completes
**Expected:** Redirects to Spotify, after authorization returns to /passport?spotify=connected, auto-imports top 20 artists with photos and "Live soon" badges where applicable
**Why human:** Requires Spotify credentials (SPOTIFY_CLIENT_ID/SECRET) and real Spotify account; OAuth redirect flow cannot be tested programmatically

### 3. Recommendations Personalization

**Test:** Log in as a fan with collected artists, view passport recommendations section
**Expected:** "Artists You Might Like" shows genre-matched artists not yet collected, with match reasons like "Based on your love for tech house"
**Why human:** Depends on actual DB state and genre data quality; need to verify visual layout and relevance

### Gaps Summary

No gaps found. All 5 observable truths are verified, all 11 artifacts exist and are substantive with real implementations (not stubs), all 11 key links are wired correctly, and all 6 requirement IDs (DISC-01 through DISC-06) are satisfied. TypeScript compiles clean. All 6 task commits are present in git history.

The phase goal -- "Fans can build their passport without waiting for live shows" -- is achieved through three complementary mechanisms: link-based discovery (any platform), Spotify OAuth bulk import, and personalized recommendations.

---

_Verified: 2026-03-07T04:30:00Z_
_Verifier: Claude (gsd-verifier)_
