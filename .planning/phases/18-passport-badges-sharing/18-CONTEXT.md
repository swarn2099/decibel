# Phase 18: Passport + Badges + Sharing - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning
**Source:** PRD Express Path (decibel-mobile-prd.md)

<domain>
## Phase Boundary

This phase delivers the fan passport screen (the hero screen of the app), badge system, and shareable card generation. The passport is where fans see their collection history as visual stamps, track tier progress per artist, view earned and locked badges, and share any of it as branded story-format cards. Also includes the public passport URL copy feature.

</domain>

<decisions>
## Implementation Decisions

### Passport Screen Layout
- Header shows fan name, city, member since date, avatar
- Stats bar shows: total artists collected (verified), total discovered, shows attended, venues visited
- Collection timeline is reverse chronological, scrollable
- Each entry: artist photo, name, venue (if verified), date, capture method icon, tier badge
- Verified collections: full color, solid badge, tier glow
- Discovered collections: muted, outline badge, "discovered" label

### Passport Visual Design (Locked — PRD is very specific)
- Passport cover animation on first open — dark cover with "DECIBEL" embossed in gold, opens to reveal collections
- Collection entries are STAMPS, not cards — slightly rotated (1-3° random), circular stamp image, bordered stamp frame, monospaced date typography, tier badge as wax seal
- Background has subtle dark paper texture with faint grid lines (dark navy/charcoal with grain)
- Page numbers shown as fan scrolls ("Page 3 of 7")
- Stats should be oversized Poppins Bold (40-60pt) — numbers are the first thing you see
- "47 shows · 12 DJs · 3 cities" format

### Badge System
- Grid layout (3-column) of circular badge icons
- Earned badges: metallic gold/silver/bronze sheen, like embossed passport seals
- Locked badges: dark impressions, grayed silhouettes — empty seal waiting to be pressed
- Tap earned badge: modal with description, rarity percentage, date earned
- Tap locked badge: modal showing unlock requirements
- Badge types: Founder, Trailblazer, First 100, Regular, Devotee, Inner Circle, Venue Local, Venue Legend, Genre Explorer, City Hopper, Night Owl, Scene Veteran, Centurion, On Fire, Unstoppable, Tastemaker, Connector

### Tier Progress
- Tap any collected artist to see tier progress
- Display format: "3/5 scans to Secret tier"
- Tiers: Network (1), Early Access (3), Secret (5), Inner Circle (10+)

### Shareable Cards
- Server-side rendering via existing Next.js API routes
- All cards: 1080x1920 (story format), dark branded design, deep link back to Decibel
- Three card types: passport summary, single-artist collection, badge achievement
- Share sheet: Instagram Stories, iMessage, copy link, save to camera roll
- "Share Passport" is a prominent CTA — gradient (purple → pink) with arrow icon

### Public Passport
- URL format: decibel-three.vercel.app/u/[username]
- "Copy profile link" button for bio linking

### Animations & Haptics
- Passport header collapses with parallax as you scroll through collections
- Stats bar becomes compact in the navigation bar on scroll
- Medium haptic impact on share actions
- Skeleton shimmer loading while data loads

### Claude's Discretion
- TanStack Query cache/invalidation strategy for passport data
- Zustand store structure for local passport state
- Component file organization within mobile/src/
- Badge rarity percentage calculation logic
- How to implement the paper texture background (image asset vs generated)
- Stamp rotation randomization approach (seeded random vs stored)
- Parallax header implementation (react-native-reanimated vs Animated API)
- Share card API endpoint design (reuse existing web endpoints or new mobile-specific ones)
- Pagination strategy for collection timeline (infinite scroll vs pages matching passport metaphor)

</decisions>

<specifics>
## Specific Ideas

- "The passport is the hero. It should be the most beautiful screen in the app. People should want to screenshot it." — PRD
- Stats format example: "47 shows · 12 DJs · 3 cities" in oversized Poppins Bold
- Collection stamps should look like visa stamps — slightly rotated, circular stamp image, bordered frame, monospaced date, wax seal tier badge
- Dark paper texture with faint grid lines — like actual passport pages but dark
- Earned badges should have metallic sheen (gold/silver/bronze). Locked badges are dark impressions.
- The contrast between earned and locked should make fans want to fill the grid
- Share button: gradient background (purple → pink), "Share" text with arrow icon
- Auto-dismiss collection confirmation after 5 seconds if no interaction
- DO NOT use white backgrounds anywhere, even in modals
- DO NOT use default React Native components without styling
- DO NOT use generic placeholder images — use gradient with initial if no photo

</specifics>

<deferred>
## Deferred Ideas

- Passport cover "opening" animation — complex Lottie animation, can be added in Phase 23 (Polish)
- Page number display while scrolling — nice-to-have, defer to Polish phase
- Metallic sheen shader effects on badges — can use static metallic-looking assets initially, enhance in Polish
- Background location for morning-after review — Phase 20 (Location)
- Friend activity feed on passport — not in Phase 18 scope

</deferred>

---

*Phase: 18-passport-badges-sharing*
*Context gathered: 2026-03-09 via PRD Express Path*
