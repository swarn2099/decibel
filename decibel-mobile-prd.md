# DECIBEL — React Native Mobile App PRD

## For Claude Code / GSD Execution

**This is a React Native (Expo) app that mirrors the web experience and adds native capabilities. Read CLAUDE.md for brand guidelines and design aesthetic.**

**The web app at decibel-three.vercel.app is the source of truth for features and design. The mobile app should feel like the same product, not a separate one.**

-----

## Why Mobile

The web app works. But three critical features require a native app:

1. **Location-based collection** — detect when a fan is at a venue and prompt them to collect the performing artist. This is the primary collection method after first use. Requires “While Using” location permission.
1. **Push notifications** — notify fans when an artist they’ve collected is playing nearby, when they earn badges, when friends join, when artists message them.
1. **Share extension** — fan shares a Spotify/Instagram/SoundCloud link TO Decibel from any app, triggering the add-artist flow without opening Decibel first.

Everything else (passport, profiles, leaderboard, map, search, add artist) mirrors the web but optimized for mobile interaction patterns.

-----

## Tech Stack

- **Framework:** React Native with Expo (SDK 52+)
- **Navigation:** Expo Router (file-based routing, mirrors Next.js patterns)
- **State:** React Query (TanStack Query) for server state, Zustand for local state
- **Backend:** Same Supabase instance as web app — shared database, shared auth
- **Auth:** Supabase Auth with magic link (email) — same flow as web
- **Location:** expo-location (foreground only — “While Using” permission)
- **Push Notifications:** expo-notifications + Supabase Edge Function for sending
- **Maps:** react-native-maps with dark custom map style
- **NFC:** expo-nfc (for future NFC tap collection)
- **Share Extension:** Expo Share Extension (receive shared links from other apps)
- **Image Generation:** Server-side via existing Next.js API routes (shareable cards)
- **Styling:** NativeWind (Tailwind for React Native) with Decibel design tokens

-----

## Design System

Carry over from web exactly:

```
Background: #0B0B0F
Card: #15151C
Pink: #FF4D6A (Network tier, hot accents)
Purple: #9B6DFF (Early Access tier)
Blue: #4D9AFF (Secret tier)
Teal: #00D4AA (Inner Circle tier)
Yellow: #FFD700 (CTAs, highlights, Founder badge)
Gray: #8E8E9A (body text)
Light Gray: #55556A (muted text)
Font: Poppins (load via expo-font)
```

The app should feel dark, underground, intentional. Not a generic white-background mobile app. Every screen should feel like it belongs in the same world as the web app.

-----

## Build Phases

### PHASE 1: Project Setup + Core Navigation

**Goal:** Expo project initialized with navigation, auth, design system, and Supabase connection.

**Tasks:**

1. Initialize Expo project with TypeScript, Expo Router
   
   ```bash
   npx create-expo-app decibel-mobile --template tabs
   ```
1. Install core dependencies:
- `@supabase/supabase-js` — database + auth
- `nativewind` + `tailwindcss` — styling
- `@tanstack/react-query` — data fetching
- `zustand` — local state
- `expo-font` — load Poppins
- `expo-secure-store` — token storage
- `expo-image` — optimized image loading
- `react-native-reanimated` — animations
- `react-native-gesture-handler` — gestures
- `expo-updates` — OTA updates
- `expo-linear-gradient` — gradient backgrounds
- `expo-blur` — glassmorphism effects
- `expo-haptics` — tactile feedback on collections and badge unlocks
- `lottie-react-native` — rich micro-animations
1. Configure EAS Build + OTA Updates:
- Run `eas init` and `eas build:configure`
- Set up three build profiles in `eas.json`:
  
  ```json
  {
    "build": {
      "development": {
        "developmentClient": true,
        "distribution": "internal"
      },
      "preview": {
        "distribution": "internal",
        "channel": "preview"
      },
      "production": {
        "channel": "production",
        "autoIncrement": true
      }
    },
    "submit": {
      "production": {
        "ios": { "appleId": "swarn2099@gmail.com" },
        "android": { "serviceAccountKeyPath": "./google-services.json" }
      }
    }
  }
  ```
- Configure `expo-updates` in app.config.ts:
  
  ```typescript
  updates: {
    url: "https://u.expo.dev/[project-id]",
    fallbackToCacheTimeout: 0,
    checkAutomatically: "ON_LOAD",
    enabled: true
  },
  runtimeVersion: { policy: "appVersion" }
  ```
- This enables pushing JS bundle updates without App Store review
- Bug fixes, new screens, UI changes all ship via OTA in minutes
- Only native module changes (new permissions, new native libraries) require a new binary build
- Run first development build: `eas build --profile development --platform ios`
1. Configure Supabase client with same credentials as web app (shared .env)
1. Set up tab navigation with 5 tabs:
- **Home** (house icon) — landing feed with upcoming events + discovery
- **Search** (magnifying glass) — search artists, add new artists
- **Collect** (plus circle, center tab, prominent) — quick collect / add artist
- **Map** (map pin) — scene map
- **Passport** (user/badge icon) — your passport, stats, badges, settings
1. Implement auth flow:
- Splash screen → check for existing session
- If no session: onboarding screens (3 slides explaining Decibel) → sign in with magic link
- If session exists: go to Home tab
- Auth state persisted via expo-secure-store
- Same Supabase Auth as web — magic link email
1. Apply design system:
- Dark background on all screens
- Poppins font loaded and set as default
- Brand colors as Tailwind theme tokens
- Tab bar: dark background, active tab in yellow, inactive in gray

**Acceptance Criteria:**

- [ ] Expo app builds and runs on iOS simulator and Android emulator
- [ ] 5-tab navigation works with correct icons
- [ ] Auth flow works end-to-end (magic link sign in, session persistence, sign out)
- [ ] Supabase queries return data (test: fetch performers list)
- [ ] Dark theme applied everywhere, Poppins font rendering
- [ ] Tab bar matches Decibel aesthetic

-----

### PHASE 2: Home Feed + Artist Profiles

**Goal:** Home screen shows upcoming events and featured artists. Artist profile pages mirror web.

**Tasks:**

1. **Home Feed:**
- “Next Weekend” section showing upcoming events (same data as web)
- Each event card: venue name, date, artist photos + names, tap to see event detail
- “Chicago Residents” horizontal scroll of local artists
- “Recently Added” section showing newest artists in the database
- Pull-to-refresh
- “Add an Artist” banner/CTA linking to add flow
1. **Artist Profile Screen:**
- Route: `/artist/[slug]`
- Artist photo (full-width hero or large circle)
- Name, genres, city, fan count
- “Collect” button (prominent, yellow) and “Discover” button (secondary)
- Social links (Spotify, SoundCloud, Instagram, RA) — tap opens in respective app or browser
- Top tracks / mixes section (SoundCloud embeds or Spotify links)
- Upcoming shows at a glance
- Founder badge display if someone founded this artist
- Similar artists row
1. **Collect Flow (from artist profile):**
- Tap “Collect” → if at venue (location check), verified collection
- Tap “Discover” → online discovery added to passport
- Confirmation animation: card slides up showing artist name, date, tier badge
- Prompt to share (generates shareable card image via API)

**Acceptance Criteria:**

- [ ] Home feed loads with real event and artist data
- [ ] Pull-to-refresh works
- [ ] Artist profile shows all available data (photo, genres, links, shows, fans)
- [ ] Collect and Discover buttons work and record to Supabase
- [ ] Confirmation animation feels celebratory, not utilitarian

-----

### PHASE 3: Passport + Badges

**Goal:** The hero screen. Visual passport showing collections, stats, badges, and shareable cards.

**Tasks:**

1. **Passport Screen:**
- Header: fan name, city, member since, avatar
- Stats bar: total artists collected (verified), total discovered, shows attended, venues visited
- Collection timeline: scrollable list of collections in reverse chronological order
  - Each entry: artist photo, name, venue (if verified), date, capture method icon, tier badge
  - Verified collections: full color, solid badge, tier glow
  - Discovered collections: muted, outline badge, “discovered” label
- Tier progress per artist: tap an artist in your collection to see “3/5 scans to Secret tier”
1. **Badges Section:**
- Grid of earned badges with icons, names, earned dates
- Unearned badges shown as locked/grayed silhouettes (so fans know what to chase)
- Tap a badge: modal with description, rarity percentage, date earned
- Badge types: Founder, Trailblazer, First 100, Regular, Devotee, Inner Circle, Venue Local, Venue Legend, Genre Explorer, City Hopper, Night Owl, Scene Veteran, Centurion, On Fire, Unstoppable, Tastemaker, Connector
1. **Shareable Cards:**
- “Share Passport” button → generates full passport summary card (server-side render via API)
- Tap any collection → “Share this” generates single-artist collection card
- Tap any badge → “Share badge” generates badge achievement card
- Share sheet: Instagram Stories, iMessage, copy link, Twitter/X, save to camera roll
- All cards: 1080x1920 (story format), dark branded design, deep link back to Decibel
1. **Public Passport:**
- Shareable link: decibel-three.vercel.app/u/[username] (web, viewable by anyone)
- “Copy profile link” button for bio linking

**Acceptance Criteria:**

- [ ] Passport shows rich visual timeline with both verified and discovered collections
- [ ] Verified vs discovered are visually distinct at a glance
- [ ] Stats are bold and screenshot-worthy
- [ ] Badge grid shows earned and locked badges
- [ ] Share generates properly formatted story-ready images
- [ ] Share sheet works for Instagram Stories and iMessage at minimum

-----

### PHASE 4: Search + Add Artist (with Founder Badge)

**Goal:** Search existing artists and add new ones from Spotify with founder badge.

**Tasks:**

1. **Search Screen:**
- Search bar at top, auto-complete against Decibel database
- Results show artist photo, name, genres, fan count
- “Not here? Add them to Decibel →” link at bottom of results
1. **Add Artist Flow:**
- Tap “Add” or navigate to add screen
- Search field queries Spotify API
- Results show: artist photo, name, genres, monthly listeners
- If < 1,000,000 monthly listeners: “Add to Decibel — earn Founder badge” (gold CTA)
- If >= 1,000,000 monthly listeners: “Add to Decibel” (regular CTA, no founder badge)
- On add: loading animation (“Building profile…”), scraping pipeline runs server-side
- Success: celebration screen with founder badge animation (if eligible)
- Artist auto-added to fan’s passport as discovered
- “Already on Decibel — founded by [name]” if artist exists
1. **Share Extension (iOS + Android):**
- Register Decibel as a share target for URLs
- When fan shares a Spotify/SoundCloud/Instagram link TO Decibel:
  - Parse the URL to extract artist info
  - If artist exists: open artist profile
  - If artist doesn’t exist: open add flow with artist pre-filled
- This enables the “add from anywhere” flow without opening Decibel first

**Acceptance Criteria:**

- [ ] Search returns results from Decibel database with autocomplete
- [ ] Spotify search works for artists not in database
- [ ] Monthly listener threshold correctly gates founder badge
- [ ] Scraping pipeline creates artist profile with available data
- [ ] Founder badge awards correctly (one per artist, ever)
- [ ] Share extension receives URLs from Spotify/Instagram and routes to correct flow

-----

### PHASE 5: Location-Based Collection

**Goal:** The killer native feature. Detect when a fan is at a venue during a live event and prompt collection.

**Tasks:**

1. **Location Permission Flow:**
- On first app open after onboarding: explain WHY location is needed
- “Decibel uses your location to know when you’re at a show so you can collect artists automatically. We only check when you open the app.”
- Request “While Using” permission (NOT “Always”)
- If denied: app works fine, just no auto-detection. Manual collect still works.
1. **Venue Detection (foreground only):**
- When app is opened (comes to foreground), get current location
- Check against venues table: is the fan within any venue’s geofence radius?
- If yes: check events table: is there an active event at this venue right now?
- If yes: show a non-intrusive banner at top of whatever screen they’re on:
  - “[Artist] is playing at [Venue] right now. Collect?”
  - Tap “Collect” → verified collection recorded
  - Tap “✕” → dismiss, don’t show again for this event
- If multiple artists are performing (lineup): show all with individual collect buttons
1. **Morning-After Review:**
- If the app wasn’t opened during an event but the fan was near a venue (detected next time app opens):
- “Looks like you were near [Venue] last night. [Artist] played from 11pm-2am. Collect?”
- This uses last-known location from the previous app open, NOT background tracking
- Only works if fan opened the app at least once that evening near the venue
1. **“I’m Here” Manual Trigger:**
- Button on Home screen: “I’m at a show”
- Tap → location check → show nearby venues with active events
- Fan selects the correct one → shown the lineup → collects artists
- Fallback for when auto-detection doesn’t trigger

**Acceptance Criteria:**

- [ ] Location permission requested with clear explanation
- [ ] Venue detection works when app is in foreground
- [ ] Banner appears with correct artist and venue when at an active event
- [ ] Collection recorded as verified with capture_method = ‘location’
- [ ] “I’m at a show” manual trigger works as fallback
- [ ] App functions fully without location permission (graceful degradation)

-----

### PHASE 6: Map + Leaderboard

**Goal:** Native map experience and leaderboard, optimized for mobile.

**Tasks:**

1. **Scene Map:**
- Full-screen dark-themed map (react-native-maps with custom dark style)
- Venue markers colored/sized by activity level
- Tap marker → bottom sheet with venue name, upcoming events, top artists
- Genre filter chips at top of map
- “Tonight” toggle — pulsing markers for venues with events today
- “Near Me” button — center map on user’s location
- Tap an artist in the venue sheet → navigate to artist profile
1. **Leaderboard:**
- Tabs: Fans / Performers
- Time filter: Weekly / Monthly / All-Time
- Fan leaderboard: rank, name (NOT email), collection count, tier badge
- Performer leaderboard: rank, photo, name, fan count, genres
- “Your Position” highlighted in teal
- “Share Rank” button generates shareable image
- Pull-to-refresh

**Acceptance Criteria:**

- [ ] Map renders with dark theme and venue markers
- [ ] Venue bottom sheet shows real event and artist data
- [ ] Genre filters work
- [ ] “Tonight” mode shows only active venues
- [ ] Leaderboard shows names not emails
- [ ] Share rank generates proper image

-----

### PHASE 7: Push Notifications

**Goal:** Keep fans engaged between shows with relevant, non-spammy notifications.

**Tasks:**

1. **Notification Types:**
- **Nearby event:** “Derrick Carter is playing Smartbar tonight. You’ve collected him 3 times.” (requires location, only when app was recently opened)
- **Badge earned:** “You just earned Genre Explorer! You’ve collected across 5 genres.”
- **Tier up:** “You reached Early Access with DJ Molinari. Early tickets unlocked.”
- **Artist message:** “[Artist] sent a message to their fans.” (when a DJ uses the messaging feature)
- **Friend joined:** “[Name] just joined Decibel. You’ve been to 3 of the same shows.”
- **Friend activity:** “[Friend] just collected [Artist] at [Venue].” (opt-in)
- **Weekly recap:** “This week: 2 shows, 3 artists collected, 1 new badge. See your stats.”
1. **Infrastructure:**
- expo-notifications for token registration
- Store push tokens in Supabase (fan_push_tokens table)
- Supabase Edge Function or cron for sending notifications via Expo Push API
- Notification preferences screen in settings (toggle each type on/off)
1. **Notification Behavior:**
- Tap notification → deep link to relevant screen (artist profile, passport, leaderboard)
- Badge on app icon showing unread count
- In-app notification center (bell icon) showing recent notifications

**Acceptance Criteria:**

- [ ] Push notification registration works on iOS and Android
- [ ] All notification types fire correctly when triggered
- [ ] Tap notification deep-links to correct screen
- [ ] Notification preferences allow toggling each type
- [ ] Notifications feel relevant, not spammy (respect frequency limits)

-----

### PHASE 8: Polish + App Store Prep

**Goal:** Final polish, performance optimization, and App Store submission readiness.

**Tasks:**

1. **Performance:**
- Image caching and lazy loading (expo-image handles this)
- Skeleton loading screens for all data-dependent screens
- Offline support: cache last-viewed passport and artist data
- App launch time < 2 seconds
1. **Animations:**
- Collection confirmation: card reveal animation with tier badge glow
- Badge unlock: starburst/confetti animation
- Tab transitions: smooth cross-fade
- Pull-to-refresh: custom branded animation
- Passport scroll: parallax header effect
1. **App Store Assets:**
- App icon: Decibel logo on dark background
- Screenshots: 6.7” and 5.5” for iPhone, showing passport, map, collection, leaderboard
- App Store description and keywords
- Privacy policy URL (required)
- TestFlight build for beta testers
1. **Error Handling:**
- Network error states on all screens (retry button)
- Empty states with illustrations (no collections yet, no badges yet)
- Auth error recovery (expired session → re-auth prompt)
1. **Analytics:**
- Track key events: app open, collection, discovery, badge earned, share, search
- Use Supabase or a lightweight analytics service
- These feed into the metrics dashboard for tracking product health

**Acceptance Criteria:**

- [ ] App runs smoothly on iPhone 13+ and modern Android devices
- [ ] No janky animations or layout shifts
- [ ] Offline mode shows cached data with clear “offline” indicator
- [ ] TestFlight build distributable to beta testers
- [ ] App Store screenshots generated and looking polished
- [ ] All error states handled gracefully

-----

## Build Order

|Phase|What                               |Est. Time|Depends On|
|-----|-----------------------------------|---------|----------|
|1    |Setup + Navigation + Auth          |2-3 days |Nothing   |
|2    |Home Feed + Artist Profiles        |2-3 days |Phase 1   |
|3    |Passport + Badges                  |3-4 days |Phase 1   |
|4    |Search + Add Artist + Founder Badge|2-3 days |Phase 1   |
|5    |Location-Based Collection          |2-3 days |Phase 2   |
|6    |Map + Leaderboard                  |2-3 days |Phase 1   |
|7    |Push Notifications                 |2-3 days |Phase 1   |
|8    |Polish + App Store Prep            |3-4 days |All phases|

**Phases 2, 3, 4, 6, 7 can run in parallel after Phase 1 is done.**
**Phase 5 depends on Phase 2 (needs artist profiles to display in collection prompt).**
**Phase 8 is the final pass after everything works.**

**Total estimated: 18-25 days**

-----

## Key Design Principles

1. **The passport is the hero.** It should be the most beautiful screen in the app. People should want to screenshot it.
1. **Collection should feel like an achievement.** Every collect — whether verified or discovered — should have satisfying visual feedback. Haptic tap on collect. Glow on badge. Celebration on tier-up.
1. **The app should feel alive between shows.** Push notifications, friend activity, discovery recommendations, morning-after prompts. The app isn’t just for Friday nights.
1. **Dark and underground, not corporate.** Every pixel should feel like it belongs in the scene. No white backgrounds, no generic Material Design, no “startup app” energy.
1. **Performance is a feature.** The app must be fast. Instant navigation, cached data, no spinners that last more than 1 second. Underground kids at 1am with bad cell service need this to work.
1. **Graceful degradation.** No location permission? App still works. No push permission? App still works. No internet? Show cached data. Never punish the user for saying no.

-----

## Visual Design Specification

**This app must be beautiful. Not “clean and functional” — genuinely stunning. Every screen should feel like a piece of the underground scene. Reference apps: Corner, Beli, Strava, Arc Browser, Linear. These are the quality bar.**

### Overall Aesthetic

- **Theme:** Dark-first, always. No light mode. The underground doesn’t have a light mode.
- **Passport Metaphor:** The entire app should feel like a digital passport / collector’s book. Think visa stamps, passport pages, embossed seals, foil badges, stamped dates. Collections aren’t list items — they’re stamps in your passport. Badges aren’t achievement icons — they’re embossed seals. The passport page number advances as you collect more.
- **Depth:** Use layered surfaces with subtle elevation. Cards float above the background. Modals have backdrop blur. Nothing feels flat. Collection cards should feel like thick paper stamps overlaid on a passport page.
- **Texture:** Subtle paper grain texture on passport backgrounds. Not a flat digital surface — it should feel tactile, like you’re flipping through a real passport. Combine the dark underground aesthetic with passport warmth — dark leather cover vibe with stamp-style entries inside.
- **Atmosphere:** Subtle gradient meshes or noise textures on backgrounds. Not solid #0B0B0F everywhere — add life with very subtle purple/pink/blue gradient washes behind key sections.
- **Typography:** Poppins throughout but with intentional hierarchy. Titles: Bold, large (24-32pt). Body: Regular, comfortable (14-16pt). Stats: Bold, oversized (40-60pt) — numbers should be the first thing you see. Dates on collection entries should feel like passport date stamps — monospaced or stamp-style treatment.
- **Iconography:** Use Lucide icons. Consistent stroke weight. Icons should be subtle guides, not attention-grabbers. Badge icons should feel like embossed passport seals — circular, detailed, with a metallic or foil quality.

### Color Usage

- Pink (#FF4D6A): Network tier, alerts, destructive actions, hot accents
- Purple (#9B6DFF): Early Access tier, secondary accents, gradient starts
- Blue (#4D9AFF): Secret tier, links, interactive elements
- Teal (#00D4AA): Inner Circle tier, success states, positive feedback
- Yellow (#FFD700): Primary CTAs, Founder badge, highlights, tab bar active state
- Use colors meaningfully — every color should communicate something about tier, status, or action

### Micro-Interactions & Animation

- **Haptics:** Medium impact on collect/discover. Light impact on button taps. Heavy impact on badge unlock and tier-up.
- **Collection confirmation:** Card rises from bottom with spring animation, artist photo scales up, tier badge pulses with glow, confetti particles for tier-ups. Use Lottie for the confetti.
- **Badge unlock:** Badge icon animates from locked (grayscale, small) to unlocked (full color, full size) with a starburst glow behind it. Haptic heavy.
- **Tab transitions:** Shared element transitions where possible (artist photo from grid to profile hero). Cross-fade for unrelated screens.
- **Pull-to-refresh:** Custom animation — Decibel logo pulses or a sound wave animation instead of the default spinner.
- **Skeleton loading:** Shimmer effect on placeholder cards while data loads. Match the card shape exactly.
- **Scroll effects:** Passport header collapses with parallax as you scroll through collections. Stats bar becomes compact in the navigation bar.

### Screen-Specific Design Notes

**Passport Screen:**

- This is the screen people screenshot. It must be art.
- **Passport cover:** When you first open the passport tab, show a brief “cover” animation — like opening a passport book. Dark cover with “DECIBEL” embossed in gold, then it opens to reveal your collections.
- Large stats at the top — “47 shows · 12 DJs · 3 cities” in oversized Poppins Bold
- **Collection entries are stamps, not cards.** Each collection should look like a visa stamp in a passport — slightly rotated (1-3 degrees random per stamp), with the artist photo as a circular stamp image, venue name in a bordered stamp frame, date in monospaced stamp typography, and the tier badge as a wax seal or foil emblem in the corner. Verified stamps are vivid and full-color. Discovered stamps are faded/outline — like a pencil sketch stamp that hasn’t been officially pressed yet.
- The background of the collections area should have a subtle paper texture with faint grid lines — like actual passport pages. Dark paper, not white — think dark navy or charcoal with the grain.
- **Page numbers:** As the fan scrolls through their collections, show page numbers in the corner like a passport booklet. “Page 3 of 7.”
- Badges section: 3-column grid of circular badge icons designed to look like embossed passport seals or medallions. Earned badges have a metallic gold/silver/bronze sheen. Locked badges are dark impressions — like an empty seal waiting to be pressed. The contrast between earned and locked should make you want to fill the grid.
- “Share Passport” button is a floating action button or prominent CTA at the bottom — gradient background (purple → pink), “Share” text with an arrow icon.

**Artist Profile:**

- Hero image: full-width, with a gradient fade to the dark background at the bottom. If no photo, use a gradient with the artist’s initial.
- “Collect” button: full-width, yellow, bottom of the hero section. This is THE action on this screen.
- Stats row below the hero: fans collected, shows played, genres — in a frosted glass card.
- Upcoming shows: timeline format with venue dots and connecting lines.
- Similar artists: horizontal scroll of circular artist photos.

**Map Screen:**

- Edge-to-edge map, no padding. Tab bar overlays the bottom.
- Custom dark map style — minimal road labels, muted colors, venue dots are the visual focus.
- Venue dots: size varies by event frequency, color varies by primary genre (house = pink, techno = blue, bass = teal, etc.)
- “Tonight” toggle: when active, non-active venues fade to 10% opacity, active venues pulse with a breathing animation.
- Bottom sheet on venue tap: slides up with venue photo, name, tonight’s lineup with artist photos, “Navigate” button.

**Collection Confirmation Modal:**

- Full-screen takeover with backdrop blur
- **Stamp press animation:** The artist photo and venue name animate in like a stamp being pressed onto a passport page — starts slightly above, slams down with a satisfying haptic thud, slight bounce, then ink spreads outward in a ring. The tier badge seals into the corner like hot wax.
- “Collected!” text with celebration animation
- Tier badge animates in below: “3rd time — Early Access unlocked”
- If tier-up: extra celebration — the wax seal cracks and reforms in the new tier color with confetti
- “Share” and “Done” buttons at the bottom
- Auto-dismiss after 5 seconds if no interaction

**Add Artist Flow:**

- Search results from Spotify show in cards with album art, name, genres, monthly listener count
- Monthly listener count shown as a progress bar toward 1M threshold
- Under 1M: gold “Founder” badge preview shown next to the add button
- Loading state during scraping: animated sound wave with “Building profile…” text
- Success state: gold confetti burst, “You’re the founder!” with badge animation

### What To Avoid

- DO NOT use default React Native components without styling. No default TextInput, no default buttons, no system alerts.
- DO NOT use white or light gray backgrounds anywhere. Not even in modals or sheets.
- DO NOT use Inter, Roboto, SF Pro, or system fonts. Poppins only.
- DO NOT use generic placeholder images. If an artist has no photo, use a gradient with their initial — never a gray square or generic avatar icon.
- DO NOT make it feel like a startup MVP. It should feel like a product from a design-obsessed team. Every pixel matters.

