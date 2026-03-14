
# DECIBEL v2.0 — The Passport

## PRD for Claude Code / GSD Execution

**This is the final feature milestone. After v2.0, no new features. Focus shifts to React Native mobile app and production hardening.**

**Read CLAUDE.md for brand guidelines, tech stack, and design aesthetic.**

-----

## Context

The passport is the core product. It’s what fans open the app for, share on Instagram, and come back to. Everything else (dashboard, leaderboard, map) supports the passport. v2.0 makes the passport the best screen in the app.

Currently the passport is thin — a list of artists collected with scan counts. v2.0 transforms it into a rich, visual, shareable record of a fan’s live music life with two collection types (verified in-person and online discovery), gamification through badges, and a pipeline that lets fans grow the artist database themselves.

-----

## Core Concept: Two Collection Types

### Verified Collection (In-Person)

- Location-confirmed attendance at a live set
- Capture methods: QR scan, NFC tap, text-to-join, location-based detection
- These COUNT toward tier progression (1 → network, 3 → early access, 5 → secret, 10+ → inner circle)
- Display with a solid badge and a “verified” indicator (checkmark, glow, distinct styling)
- This is the gold standard — what makes Decibel different from every other music app
- DJs see these in their dashboard as “real fans”

### Discovered Collection (Online)

- Fan finds an artist through Spotify, Apple Music, Instagram, TikTok, or browsing Decibel
- Fan adds them to their passport as a “discovery”
- These DO NOT count toward tier progression
- Display with a lighter style — outline badge, “discovered” label, no tier color
- But they DO: enable notifications when that artist plays near you, contribute to taste profile for recommendations, show on your passport timeline, count toward discovery-specific badges

### Why Both Matter

The passport tells a story: “I discovered DJ Molinari online in January. I collected them in-person for the first time in February. By June I was inner circle.” The journey from discovery to superfan is the product narrative. Online discovery creates the on-ramp. Verified collection is the destination.

-----

## Phase 1: Passport Visual Overhaul

### Goal

Transform the fan profile/passport page from a basic list into a rich, visual, shareable experience.

### Requirements

**1.1 Passport Layout**

- Header: fan name, city, member since date, total stats (X artists collected, Y verified, Z shows attended, W venues visited)
- Visual timeline: scrollable horizontal or vertical timeline showing collections in chronological order
- Each timeline entry shows: artist photo, artist name, venue, date, capture method icon (QR/NFC/location/online), verified vs discovered badge
- Verified collections are visually prominent (full color, solid badge, tier indicator)
- Discovered collections are visually lighter (muted, outline badge, “discovered” tag)
- Tier badges per artist: show current tier (network/early_access/secret/inner_circle) with the brand colors (pink/purple/blue/teal)

**1.2 Stats Dashboard on Passport**

- “Your Year in Sound” section (always visible, not just year-end):
  - Total dancefloors visited
  - Cities
  - Unique artists collected (verified)
  - Unique artists discovered (online)
  - Most-collected artist (with scan count)
  - Most-visited venue
  - Favorite genre (inferred from collection patterns)
  - Streak: consecutive weeks with at least one verified collection
- Stats should be visually bold — large numbers, brand colors, designed to screenshot

**1.3 Shareable Passport Card**

- “Share My Passport” button generates a 1080x1920 story-ready image
- Dark background, Decibel branding
- Fan’s top stats, top 3-5 artists with photos, tier badges
- QR code or deep link to view their public passport
- Different card variants: full passport summary, single-artist highlight, year-in-review
- Share sheet: Instagram Stories, iMessage, copy link, Twitter/X

**1.4 Public Passport View**

- Route: /passport/[fan-slug] or /u/[username]
- Publicly viewable (no login required to view, login required to create)
- Shows the fan’s collection timeline, stats, and badges
- OG meta tags generate a preview card showing their stats
- This is the URL fans put in their Instagram bio

### Acceptance Criteria

- [ ] Passport page shows rich timeline with both verified and discovered collections
- [ ] Verified and discovered collections are visually distinct
- [ ] Stats section shows all key metrics with bold visual treatment
- [ ] Share button generates story-ready image
- [ ] Public passport URL works and generates OG preview
- [ ] Passport looks intentionally designed — not a data table, a showcase

-----

## Phase 2: Online Discovery + Add From Anywhere

### Goal

Let fans discover and add artists to their passport from outside the live event context, and grow the artist database through user contributions.

### Requirements

**2.1 Add Artist from Link**

- Fan can paste or share a link from Spotify, Apple Music, SoundCloud, Instagram, TikTok, YouTube, or RA into Decibel
- The app uses AI/parsing to extract the artist name from the link
- If the artist exists in the Decibel database: add as a “discovered” collection on the fan’s passport
- If the artist does NOT exist: kick off an automatic scraping pipeline:
1. Search SoundCloud API for the artist name → pull profile, mixes, genres, followers, photo
1. Search Spotify (if accessible) → pull genres, popularity, photo
1. Search RA → pull event history
1. Search Instagram → pull handle, follower count
1. Create a new performer profile in the database with all scraped data
1. Add the “discovered” collection to the fan’s passport
1. Award the fan a **Discovery Badge** (see Phase 3)
- Share extension / deep link: fan shares a Spotify/IG link directly to Decibel app (mobile) or pastes URL on web

**2.2 Spotify Integration**

- Fan connects their Spotify account via OAuth
- Decibel reads their top artists (short-term, medium-term, long-term) and recently played
- Cross-reference against Decibel database
- Auto-populate “discovered” collections for any matching artists
- For matched artists who have upcoming events in the fan’s city: surface a prompt “You listen to [artist] a lot. They’re playing [venue] this Friday. Collect them in person?”
- Listening stats contribute to a “taste profile” for recommendations
- Show a “From Spotify” badge on auto-discovered collections

**2.3 Apple Music Integration**

- Same as Spotify integration but via Apple Music API / MusicKit
- Requires iOS app (flag as mobile-app-dependent if building web first)
- Can stub the UI with “Coming soon — connect Apple Music in the mobile app”

**2.4 Smart Recommendations**

- Based on a fan’s verified collections + discovered artists + Spotify data, recommend:
  - “Artists you might like” — similar genres, overlapping fan bases
  - “Playing near you this week” — upcoming events for artists in their taste profile
  - “Your friends collected” — artists that friends on Decibel have collected recently
- Recommendations surface on the passport page and in a discovery feed

### Acceptance Criteria

- [ ] Fan can paste a Spotify/SoundCloud/RA/Instagram link and add an artist
- [ ] If artist doesn’t exist, scraping pipeline creates them automatically
- [ ] Spotify OAuth connects and imports top artists as discoveries
- [ ] Discovered artists show as lighter entries on passport (distinct from verified)
- [ ] “Playing near you” recommendations surface for discovered artists with upcoming shows
- [ ] Scraping pipeline handles edge cases (artist not found, ambiguous names, duplicates)

-----

## Phase 3: Badges and Gamification

### Goal

Add a badge system that rewards both in-person attendance and online discovery, creating collection incentives beyond tier progression.

### Requirements

**3.1 Badge Types**

Discovery Badges:

- **Trailblazer**: You added an artist to Decibel who wasn’t in the database yet. You brought them here.
- **First 100**: You were among the first 100 people to collect this artist (online or in-person).
- **First 10 Verified**: You were among the first 10 people to collect this artist in-person. Rare.

Attendance Badges:

- **Regular**: Collected the same artist 3+ times in-person.
- **Devotee**: Collected the same artist 5+ times in-person.
- **Inner Circle**: Collected the same artist 10+ times in-person.
- **Venue Local**: Collected 5+ different artists at the same venue.
- **Venue Legend**: Collected 10+ different artists at the same venue.

Exploration Badges:

- **Genre Explorer**: Collected artists across 5+ different genres.
- **City Hopper**: Collected artists in 3+ different cities.
- **Night Owl**: 10+ verified collections (any artist, any venue).
- **Scene Veteran**: 50+ verified collections.
- **Centurion**: 100+ verified collections.

Streak Badges:

- **On Fire**: Verified collection 3 weeks in a row.
- **Unstoppable**: Verified collection 8 weeks in a row.
- **Year-Round**: Verified collection in 10+ different months in a calendar year.

Social Badges:

- **Tastemaker**: 10+ people discovered an artist within 30 days of you discovering them first.
- **Connector**: You and 5+ friends have collected the same artist.

**3.2 Badge Display**

- Badges shown on passport page in a grid/showcase section
- Each badge has: icon, name, description, date earned, rarity (how many people have it)
- Rarity tiers: Common (>10% of users), Uncommon (5-10%), Rare (1-5%), Legendary (<1%)
- Badge unlock animation on the passport when earned
- Badge count shown on public passport preview

**3.3 Badge Infrastructure**

- Database table: fan_badges (fan_id, badge_type, earned_at, metadata jsonb)
- Badge evaluation runs: on every new collection (both verified and discovered), on milestone events (streak check daily)
- Some badges are retroactive (if a fan already has 5 collections, they get Night Owl immediately on feature launch)
- Badge check should be efficient — don’t re-evaluate all badges on every action, only relevant ones

### Acceptance Criteria

- [ ] All badge types from the list above are implemented
- [ ] Badges display on passport page with icons, names, dates, and rarity
- [ ] Badge unlock triggers visual feedback (animation, toast, or modal)
- [ ] Badges are retroactively awarded for existing collection data
- [ ] Rarity percentages update as user base grows
- [ ] Trailblazer badge awards when fan triggers the “add new artist” scraping pipeline
- [ ] First 100 / First 10 badges track correctly per artist

-----

## Phase 4: Enhanced Artist Profiles

### Goal

Make artist profile pages richer and more useful, supporting both the discovery and collection flows.

### Requirements

**4.1 Profile Enrichment**

- Pull and display: top tracks/mixes (from SoundCloud), genres, bio, photo, social links
- Upcoming shows section (from scraped events data) with venue, date, “Collect at this show” CTA
- Past shows section (from events data) with venue history
- Fan stats: total collectors (verified), total discoverers (online), fan tier breakdown
- Similar artists (based on genre overlap and fan co-collection patterns)

**4.2 Spotify/Apple Music Embeds**

- If artist has a Spotify profile: embed their top tracks player or link to Spotify
- If artist has an Apple Music profile: link to Apple Music
- SoundCloud embed for mixes (already partially implemented)
- These give fans a way to listen directly from the profile and decide whether to discover/collect

**4.3 “Collect” vs “Discover” CTAs**

- Two distinct buttons on artist profile:
  - “Collect” — for in-person (shows the QR code, or says “Collect at their next show” with venue/date)
  - “Discover” — for online (adds a discovery to your passport immediately)
- If the fan has already discovered but not collected: show “You’ve discovered [artist]. Collect them in-person to unlock tiers.”
- If the fan has both: show tier progress and next milestone

**4.4 Artist Claim Flow**

- Unclaimed profiles show a “Claim this profile” button
- Claimed profiles show a “verified artist” badge
- Claim flow: artist enters their email, receives magic link, verifies identity by linking their SoundCloud/Spotify
- Claimed artists can: edit bio, update photo, manage upcoming shows, message fans, see dashboard

### Acceptance Criteria

- [ ] Artist profiles show rich data (tracks, upcoming shows, past shows, fan stats, similar artists)
- [ ] Spotify/SoundCloud embeds or links work on profiles
- [ ] “Collect” and “Discover” are distinct CTAs with different flows
- [ ] Claim flow works end-to-end for artists
- [ ] Profiles that were auto-scraped are clearly marked as “unclaimed” with an invitation to claim

-----

## Phase 5: Passport Sharing and Social

### Goal

Make the passport inherently shareable and social, driving organic growth through user-generated content.

### Requirements

**5.1 Shareable Cards (Enhanced)**

- Single-artist card: “I just collected [artist] at [venue]” — story-ready image
- Milestone card: “I just hit Inner Circle with [artist]” — celebratory design
- Badge card: “I just earned [badge name]” — showcase the badge with description
- Discovery card: “I just brought [artist] to Decibel” — for Trailblazer moments
- Stats card: “My 2026 so far: X dancefloors, Y artists, Z cities” — shareable summary
- All cards include deep link / QR code back to the fan’s passport or the artist’s page

**5.2 Activity Feed**

- Feed on the home page showing recent activity from friends:
  - “[Friend] collected [artist] at [venue]”
  - “[Friend] discovered [artist]”
  - “[Friend] earned [badge]”
  - “[Friend] reached Inner Circle with [artist]”
- Feed creates FOMO and discovery — you see your friend at a show you missed, you discover artists through their activity
- Privacy: activity is visible to mutual followers only (can be toggled to public or private)

**5.3 Follow System**

- Fans can follow other fans
- Following shows their activity in your feed
- “People you may know” suggestions based on: shared collections (you’ve both collected the same artists), phone contacts on Decibel, same city
- Follower/following counts on passport

**5.4 “Someone you know just joined” Notifications**

- When a phone contact joins Decibel, send a push notification
- “[Name] just joined Decibel. You’ve been to 3 of the same shows.”
- This was identified as a high-impact growth hack from the Beli playbook

### Acceptance Criteria

- [ ] All shareable card types generate properly formatted story-ready images
- [ ] Activity feed shows friend activity in chronological order
- [ ] Follow system works (follow, unfollow, mutual followers)
- [ ] “Someone you know joined” notifications fire when contacts join
- [ ] Privacy settings allow fans to control who sees their activity

-----

## Build Order

|Phase|What                                |Est. Time|Depends On                                          |
|-----|------------------------------------|---------|----------------------------------------------------|
|1    |Passport visual overhaul            |3-4 days |Nothing                                             |
|2    |Online discovery + add from anywhere|3-4 days |Phase 1 (passport needs to display discoveries)     |
|3    |Badges and gamification             |2-3 days |Phase 1 + 2 (badges reference both collection types)|
|4    |Enhanced artist profiles            |2-3 days |Phase 2 (needs discover CTA and scraping pipeline)  |
|5    |Passport sharing and social         |2-3 days |Phase 1 + 3 (shares badges and passport)            |

**Total estimated: 12-17 days**

**After v2.0: FEATURE FREEZE. Next milestone is React Native mobile app + production hardening. No new features until mobile ships.**

-----

## Key Design Principles for v2.0

1. **The passport is the hero screen.** Every design decision should make someone want to screenshot their passport and share it.
1. **Verified > Discovered.** Always. The visual hierarchy must make in-person collections feel special and online discoveries feel like the appetizer, not the main course.
1. **Badges should feel earned, not given.** Rarity matters. If everyone has every badge, none of them are special. Legendary badges should be genuinely hard to get.
1. **The app should have a reason to open every day.** Between shows: check recommendations, discover artists, browse friends’ activity, see your stats grow. The passport is alive, not dormant.
1. **Everything is shareable.** If a fan achieves something, there should be a beautiful card ready to post within one tap.

