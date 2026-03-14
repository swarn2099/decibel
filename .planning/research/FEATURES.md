# Feature Landscape: Decibel React Native Mobile App

**Domain:** Location-based live music fan passport / collection app (React Native)
**Researched:** 2026-03-08
**Confidence:** MEDIUM-HIGH

---

## Table Stakes

Features users expect from a mobile collection/check-in/passport app. Missing any of these and the app feels broken or incomplete. These are informed by what Beli, Strava, Swarm/Foursquare, Momento, Spotify Wrapped, and Last.fm have normalized.

### Core Collection

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| QR scan collection (camera-native) | This is the primary capture method from web. Mobile must make it faster, not slower. Momento and Swarm both have one-tap check-in. Users expect sub-3-second capture. | Low | Use expo-camera for QR scanning. Parse the `/collect/[slug]` URL and trigger collection inline -- no browser redirect. |
| Location-based venue detection | THE reason to build a native app. Swarm built its entire product on this. Beli uses it for restaurant verification. Fans expect "the app knows I'm here." Foreground-only ("While Using") is sufficient and privacy-respectable. | High | expo-location + geofence matching against venues table. Must handle GPS drift (50-100m radius). Only check on app foreground, never background track. |
| Discover (online) collection | Already exists on web. Mobile must mirror it. Beli lets you add restaurants you want to visit. Decibel's "discover" is the equivalent -- adding artists to your radar before seeing them live. | Low | Single tap on artist profile. Visually distinct from verified collection (muted/outline vs solid/glowing). |
| Offline-resilient collection | Underground venues have terrible cell service. If a fan scans a QR code and has no signal, the collection MUST queue and sync later. Strava handles this for GPS activities. Swarm caches check-ins offline. This is table stakes for a venue app. | Medium | Queue collections in local storage (MMKV or AsyncStorage). Sync on next connectivity. Show "pending" state in passport. |
| Confirmation animation + haptics | Beli celebrates every rating. Strava celebrates every PR. Momento celebrates every check-in. The moment of collection is the product's emotional peak. A flat "success" toast is a missed opportunity. | Medium | Spring animation, haptic feedback (expo-haptics), tier badge reveal. This is where the "stamp press" passport metaphor comes alive. |

### Passport (The Hero Screen)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Visual collection timeline | Concert Archives, Momento, and Last.fm all provide chronological history. Fans want to see their live music journey over time. Without a timeline, the passport is just a list. | Medium | Reverse-chronological scroll. Each entry: artist photo, venue, date, capture method icon, tier badge. Verified entries are vivid; discovered entries are muted. |
| Stats dashboard | Spotify Wrapped proved fans are obsessed with their own data. Last.fm's scrobble counts drive obsessive engagement. Strava's weekly summaries keep users coming back. Stats must be bold, oversized numbers -- screenshot bait. | Medium | Total shows, unique artists, cities, venues, streaks. "Your Year in Sound" section visible year-round, not just December. |
| Badge/achievement display | Strava badges, Swarm mayorships, Beli milestones, Duolingo achievements. Every successful collection/check-in app has a badge system. Users expect to see what they've earned and what they're chasing. | Medium | Grid of earned badges (vivid) and locked badges (silhouettes). Tap for details + rarity percentage. Locked badges create aspiration -- "what do I need to do to get that?" |
| Public passport URL | Strava profiles are public. Beli profiles are shareable. Corner lets you share your curated map. Fans need a URL to put in their Instagram bio. Without it, the passport is invisible to non-users. | Low | Web route `/passport/[slug]` or `/u/[username]` already exists. Mobile just needs a "Copy link" button. OG meta tags for social previews. |
| Shareable story cards | Spotify Wrapped cards are shared 60M+ times. Strava share cards are ubiquitous on Instagram. Beli has shareable ranking cards. If you can't share your achievement in one tap, it might as well not exist. | Medium | 1080x1920 story-ready images generated server-side. Variants: passport summary, single artist collection, badge earned, milestone reached, stats recap. Share sheet: Instagram Stories, iMessage, copy link, X. |

### Navigation + Core UX

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Tab-based navigation (5 tabs) | Every comparable app uses bottom tabs. Strava: Feed/Map/Record/Clubs/You. Beli: Home/Search/Add/Lists/Profile. Swarm: Feed/Search/Check-in/Map/Profile. | Low | Home / Search / Collect (center, prominent) / Map / Passport. The center "Collect" tab is the primary action -- make it visually distinct (larger, yellow). |
| Pull-to-refresh | Universal mobile pattern. Every feed, list, and profile screen needs it. Users will pull down when data feels stale. | Low | React Query's refetch on pull. Custom branded animation (sound wave pulse, not default spinner). |
| Skeleton loading states | Users see shimmer placeholders on every modern app. A blank white screen while loading feels broken. | Low | Shimmer cards matching the exact shape of real content. Use react-native-skeleton-placeholder or custom. |
| Search with autocomplete | Beli, Spotify, Bandsintown all have instant search. Type "Der" and see "Derrick Carter" immediately. Search must hit both local DB cache and server. | Medium | Search Decibel database first, then offer "Search Spotify" for artists not found. Debounced input, cached results. |
| Settings + notification preferences | Every app with push notifications must let users control them granularly. Apple's App Store review will reject without it. | Low | Toggle each notification type on/off. Account settings: name, city, avatar, connected accounts. |

### Authentication

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Magic link email auth | Matches web. No passwords. Underground kids at 1am won't remember a password. | Low | Supabase Auth magic link. Deep link back into app via universal links / app links. |
| Session persistence | Users expect to stay logged in. Strava, Beli, Spotify -- none require re-auth on every open. | Low | expo-secure-store for token storage. Auto-refresh on app foreground. |
| Onboarding (3 slides max) | 77% of users drop off within 3 days. Onboarding must be fast and convey core value. Beli does 3 slides. Strava does 3 slides. More than that and users skip. | Low | Slide 1: "Collect artists at live shows" (scan visual). Slide 2: "Build your music passport" (passport visual). Slide 3: "Unlock tiers the more you show up" (tier progression). Then auth. |

---

## Differentiators

Features that create competitive advantage. No comparable app does these, or Decibel does them meaningfully better.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Verified physical attendance as core mechanic** | Momento tracks attendance but doesn't verify it (self-reported). Concert Archives is self-reported. Bandsintown lets you RSVP but doesn't verify you went. Swarm check-ins are self-reported (you can check in from your couch). Decibel's QR/NFC/location capture creates VERIFIED attendance that performers and fans can trust. This is the moat. | Already built (QR), Medium (location) | QR scan at venue = verified. Location detection at venue during event = verified. Online discovery = explicitly NOT verified. The distinction must be visually unmistakable. |
| **Tiered access progression (1/3/5/10+)** | No competitor rewards repeat attendance with escalating access. Ultra Music Festival's Passport program has tiers but is festival-specific and corporate. Decibel's tier system works across all artists and is artist-specific -- "Inner Circle with Derrick Carter" means something. | Medium | Network (1) -> Early Access (3) -> Secret (5) -> Inner Circle (10+). Tier progression per artist is visible on passport and artist profile. Tier-up moments get celebratory animations. |
| **Passport stamp metaphor** | Momento is a "scrapbook." Concert Archives is a "database." Beli is a "ranking." Decibel is a PASSPORT -- visa stamps, embossed seals, page numbers. This metaphor is stickier and more shareable than a list or grid. Physical passport aesthetics (paper texture, stamp rotation, wax seal badges) create emotional attachment. | High | Custom stamp-style collection entries. Random slight rotation per stamp (1-3 degrees). Tier badges as wax seals. Dark paper texture background. Page numbers. This is the design investment that makes screenshots go viral. |
| **Pre-built artist profiles (claim model)** | Bandsintown requires artists to register. NoSongRequests requires artist signup. Decibel has 2,164 artist profiles already built from scraped data. The artist profile EXISTS before the artist knows about Decibel. Outreach becomes "claim your page" not "create an account." | Already done | Profiles pre-populated from EDMTrain + RA + DICE + SoundCloud scraping. Claim flow: magic link + social verification. |
| **Founder badge (fan-sourced artist database)** | No competitor lets fans ADD artists and earn permanent credit. Beli lets you rate restaurants but anyone can. Decibel's Founder badge is unique and permanent -- "I brought this artist to Decibel." Creates viral loop: fan adds artist, shares founder card, artist's fans join to collect. | Low | One Founder badge per artist, ever. Awarded to the fan who triggers the scraping pipeline for a new artist. Gold badge treatment. Shareable "I brought X to Decibel" card. |
| **Two-collection-type system (Verified vs Discovered)** | No comparable app distinguishes between "I was there" and "I like this artist." Spotify is all listening. Last.fm is all scrobbles. Momento is all attendance. Decibel tells the story: "I discovered them online, then collected them in person, now I'm Inner Circle." The journey from discovery to superfan IS the product narrative. | Medium | Discovered = muted/outline stamp, no tier progression. Verified = vivid/solid stamp, tier progression. The visual hierarchy must make verified feel like gold and discovered feel like a preview. |
| **"I'm at a show" manual trigger** | Fallback for when auto-detection doesn't fire. Swarm has "check in" as a manual action. Decibel's version is contextual: it shows nearby venues with active events, so the fan just confirms. Smarter than generic check-in because it's event-aware. | Medium | Button on Home screen. Location check -> show nearby venues with tonight's events. Fan taps the right one, sees lineup, collects artists. Works even without geofence triggering. |
| **Morning-after review** | No check-in app does this. Swarm only works in real-time. "Looks like you were near Smartbar last night. Derrick Carter played 11pm-2am. Collect?" Uses last-known location from previous app open, not background tracking. Captures the fans who forgot to open the app during the set. | Medium | Only triggers if fan opened app near a venue but didn't collect during an event window. Next app open: "Were you at X last night?" Feels magical, not creepy -- because it's based on foreground location, not surveillance. |
| **Performer-owned audience (exportable)** | Laylo owns the fan data. Instagram/TikTok own the algorithm. Decibel gives performers a CSV export of their verified fan list. This is a trust differentiator that makes performer adoption easier. "Your fans, your data, forever." | Low | CSV export from performer dashboard. Fan email, tier, scan count, first/last collection dates. This is the "I'm not another platform that traps you" signal. |
| **Share extension (receive URLs from other apps)** | Fan sees an artist on Spotify/Instagram/SoundCloud, shares the link TO Decibel, and the artist gets added to their passport. No other music collection app receives inbound shares like this. Beli doesn't do this. Strava doesn't do this. This turns every music app into a Decibel on-ramp. | High | expo-share-intent or expo-share-extension. Parse incoming URLs to extract artist info. If artist exists: open profile. If not: trigger add flow. iOS share extensions have Apple review complexity. |
| **Push notifications (contextual, not spammy)** | "Derrick Carter is playing Smartbar tonight. You've collected him 3 times." This is relevant context that no other app provides. Bandsintown sends generic "X is playing near you" but without the personal history. Decibel's notifications include YOUR relationship with the artist. | Medium | Nearby event (with your collection context), badge earned, tier up, artist message, friend joined, weekly recap. Each individually toggleable. Frequency-capped to avoid notification fatigue. |

---

## Anti-Features

Features to explicitly NOT build. These are tempting but would hurt the product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Background location tracking ("Always" permission)** | Users are increasingly privacy-conscious (58% of enterprise geofencing now uses AI prediction to AVOID constant tracking). Apple scrutinizes "Always" location apps heavily in review. Underground music fans will be especially suspicious. "While Using" is sufficient and trustworthy. | Foreground-only location detection. Check venue proximity when app is opened. "I'm at a show" manual trigger as fallback. Morning-after review using last foreground location. Never background track. |
| **Song requests / tipping** | NoSongRequests' territory. Wrong audience. Underground DJs play curated sets. Tips feel like wedding DJ energy. Would repel the target market. | Focus on collection + tiers + audience ownership. Performers monetize through bookings enabled by verified fan data, not in-app transactions. |
| **In-app music player / streaming** | Spotify, Apple Music, SoundCloud already do this infinitely better. Building playback dilutes the core value and adds massive complexity (licensing, buffering, audio session management). | Embed SoundCloud widget on artist profiles. Deep link to Spotify/Apple Music. Let fans listen on their preferred platform. Decibel is about physical attendance, not streaming. |
| **Light mode** | The underground doesn't have a light mode. Design consistency matters. Every comparable underground/nightlife app is dark-only. Adding light mode doubles design surface area for zero benefit with this audience. | Dark mode only. Period. Match the web app's established dark aesthetic (#0B0B0F background, brand accent colors). |
| **Complex social graph (following, DMs, comments)** | Building a social network requires critical mass that a new app won't have. Early users will see empty feeds and churm. Strava's social works because they have 120M+ users. Beli's social works because of college density. Decibel won't have that at launch. | Start with follow system only (follow fans, see their collections on your feed). No DMs, no comments, no reactions beyond basic "following." Social features expand as user base grows. Activity feed is read-only. |
| **Full event ticketing / booking** | Bandsintown, DICE, Resident Advisor already own ticketing. Adding ticket sales means payment processing, refund handling, venue partnerships, commission negotiation. Massive distraction from core value. | Link out to ticket sources (DICE, RA, Eventbrite) on event listings. "Get tickets" is a link, not a feature. |
| **Complicated badge math that requires a spreadsheet** | Duolingo-style streak anxiety drives engagement but also drives resentment. 40% of teens are voluntarily limiting smartphone use due to gamification anxiety. Underground music fans will reject feeling manipulated. | Badges should reward authentic behavior, not manufactured engagement. No "you lost your streak!" punishments. Streaks are positive-only (celebrate the streak, don't penalize the break). Rarity should be real (based on actual user base), not inflated. |
| **AI-generated content / recommendations at launch** | AI recommendations need data to be useful. With a small initial user base, recommendations will be bad and erode trust. "Artists you might like" with bad suggestions feels broken. | Launch with editorial/manual curation: "Chicago Residents," "This Weekend," "Recently Added." Add algorithmic recommendations only when collection data is sufficient (1000+ fans with 5+ collections each). |
| **Merch store / e-commerce** | Adds inventory management, payment processing, shipping, returns. Underground DJs sell merch at the table or on Bandcamp. Commerce is a different business. | Link to artist's Bandcamp/merch store on their profile. Don't build commerce infrastructure. |
| **Real-time chat / live interaction during sets** | DJs are mixing, not reading messages. Fans are dancing, not typing. Real-time chat requires moderation infrastructure. Would be empty and feel broken. | Performer-to-fan messaging only (async, one-directional broadcast). Tier-targeted messages from performer dashboard. No live chat. |

---

## Feature Dependencies (Mobile-Specific)

```
Expo Project Setup -> ALL features

Auth (magic link + session) -> Passport
Auth -> Collection (must know who is collecting)
Auth -> Push notification registration
Auth -> Follow system

Supabase Client -> ALL data features

Artist Profiles -> Collection flow (need profile to collect from)
Artist Profiles -> Search results (search links to profiles)

QR Scan (expo-camera) -> Verified collection
Location Services (expo-location) -> Venue detection -> Auto-collect prompt
Location Services -> "I'm at a show" manual trigger
Location Services -> Morning-after review
Location Services -> Map screen

Collection flow -> Passport timeline entries
Collection flow -> Badge evaluation
Collection flow -> Tier progression
Collection flow -> Shareable cards

Badge system -> Badge display on passport
Badge system -> Badge unlock notifications
Badge system -> Shareable badge cards

Push token registration -> ALL push notifications
Push notification types -> Deep linking (tap notification -> correct screen)

Search -> Add Artist flow (Spotify search for new artists)
Add Artist flow -> Founder badge
Add Artist flow -> Scraping pipeline (server-side)

Share extension -> Add Artist flow (receive URLs from other apps)

Map (react-native-maps) -> Venue markers -> Bottom sheet -> Artist profiles
Map -> "Tonight" toggle (requires events data)

Follow system -> Activity feed
Activity feed -> Friend activity notifications

Shareable cards (server-side generation) -> Share sheet (Instagram, iMessage, X)
```

Critical path for MVP:
```
Setup -> Auth -> Supabase Client -> Artist Profiles -> Collection Flow -> Passport
                                                            |
                                              QR Scan ------+
                                              Location -----+
                                                            |
                                                     Badge Evaluation
                                                            |
                                                     Shareable Cards
```

---

## MVP Recommendation (Mobile App Launch)

### Must Ship (TestFlight v1)

1. **Auth + onboarding** -- 3-slide onboarding, magic link, session persistence. Without auth, nothing works.
2. **Passport screen** -- The hero. Timeline, stats, badges, share button. This is what fans open the app for. Must be beautiful from day one.
3. **Artist profiles** -- Photo, name, genres, upcoming shows, Collect/Discover CTAs, social links. The profile is what QR codes link to.
4. **QR scan collection** -- Native camera QR scanner. Must be faster than the web flow. Sub-2-second scan-to-confirmation.
5. **Location-based collection** -- THE killer native feature. Foreground venue detection + "I'm at a show" manual trigger. This is why the app exists.
6. **Search + add artist** -- Search Decibel DB with autocomplete. Spotify search for artists not found. Founder badge on new additions.
7. **Push notifications (core set)** -- Nearby event, badge earned, tier up, weekly recap. Register tokens on auth. Individually toggleable.
8. **Offline collection queue** -- Collections must work with bad cell service. Queue locally, sync when connected.

### Ship Next (TestFlight v2)

9. **Map screen** -- Dark-themed map, venue markers, tonight toggle, venue bottom sheets with lineups.
10. **Morning-after review** -- "Were you at X last night?" prompt using last foreground location.
11. **Share extension** -- Receive Spotify/SoundCloud/Instagram URLs from other apps. This is a growth lever.
12. **Leaderboard** -- Fan and performer rankings with time filters. "Share rank" card generation.
13. **Activity feed (basic)** -- Show friend collections and badge unlocks. Read-only, no interactions.
14. **NFC tap collection** -- expo-nfc for NFC-enabled venues. Secondary to QR but cooler at the right venues.

### Defer (Post-Launch)

- **Apple Music integration** -- Requires MusicKit, iOS-only complexity. Spotify covers most users first.
- **AI recommendations** -- Need sufficient collection data before this is useful. Manual curation first.
- **Advanced social features** -- DMs, comments, reactions. Need critical mass first.
- **Performer mobile dashboard** -- Performers manage from web. Mobile is fan-first.
- **Widget (home screen)** -- "Next show near you" widget. Cool but not launch-critical.
- **Apple Wallet pass** -- Alternative to push notifications for fans who decline push permission. Future growth lever.

---

## Comparable App Feature Matrix

| Feature | Decibel | Beli | Strava | Swarm | Momento | Spotify | Last.fm | Bandsintown |
|---------|---------|------|--------|-------|---------|---------|---------|-------------|
| Verified attendance | QR/NFC/Location | GPS | GPS | Self-report | Self-report | N/A | N/A | RSVP only |
| Collection/check-in | Yes (two types) | Yes (ratings) | Yes (activities) | Yes (check-ins) | Yes (momentos) | N/A | Scrobbles | Track only |
| Tiered rewards | Yes (4 tiers) | No | No | Mayorships | No | No | No | No |
| Stats/wrapped | Year-round | Leaderboard | Weekly/yearly | Lifetime | Lifetime | Annual | Always-on | No |
| Badges/achievements | Yes (20+ types) | Milestones | Challenges | Badges | No | Wrapped cards | No | No |
| Shareable cards | Story-ready | Rankings | Activity cards | No | Profile | Wrapped cards | No | No |
| Social/activity feed | Friends' collections | Friend ratings | Club feed | Friend check-ins | Profile | Blend | Friends | Following |
| Map | Venue map | Restaurant map | Activity map | Explore map | No | No | No | Event map |
| Push notifications | Contextual | Updates | Activity | Nearby | No | New releases | No | Events |
| Offline support | Collection queue | No | GPS recording | Cached check-ins | No | Downloads | No | No |

---

## Sources

- [Beli App - Wikipedia](https://en.wikipedia.org/wiki/Beli_(app)) - Gamified restaurant rating/collection app (HIGH confidence)
- [Beli Gamifies Dining - WebProNews](https://www.webpronews.com/beli-app-gamifies-dining-to-attract-gen-z-and-challenge-yelp/) - Gen Z engagement patterns (MEDIUM confidence)
- [Foursquare Swarm - Wikipedia](https://en.wikipedia.org/wiki/Foursquare_Swarm) - Check-in gamification patterns (HIGH confidence)
- [Strava Gamification Case Study - Trophy](https://trophy.so/blog/strava-gamification-case-study) - Badge/streak engagement data (MEDIUM confidence)
- [Strava Social Features](https://communityhub.strava.com/strava-features-chat-5/social-features-1438) - Activity feed and sharing patterns (HIGH confidence)
- [Spotify Wrapped 2025](https://newsroom.spotify.com/2025-12-03/2025-wrapped-user-experience/) - Stats sharing virality (HIGH confidence)
- [Last.fm Track My Music](https://www.last.fm/about/trackmymusic) - Scrobbling and music stats (HIGH confidence)
- [Momento App](https://www.acmomento.com/) - Concert/sports attendance scrapbook, currently in beta for music (MEDIUM confidence)
- [Concert Archives](https://www.concertarchives.org/) - Fan-built concert database (MEDIUM confidence)
- [Bandsintown 2025 Trends](https://musically.com/2025/12/17/bandsintown-reveals-its-2025-trends-for-music-concerts/) - 100M fans, 700K artists, 32.6% travel increase (HIGH confidence)
- [NoSongRequests](https://nosongrequests.com/) - 16K performers, QR-based DJ-fan engagement (MEDIUM confidence)
- [Corner App - App Store](https://apps.apple.com/us/app/corner-curate-share-places/id1668282277) - Place curation + sharing design patterns (MEDIUM confidence)
- [ConcertPass](http://concertpass.net/) - Concert loyalty rewards app, invite-only (LOW confidence)
- [Ticket Fairy Festival Loyalty](https://www.ticketfairy.com/blog/2025/09/26/fans-for-life-designing-a-festival-loyalty-program-to-boost-repeat-attendance-and-revenue/) - Festival tier/loyalty program design (MEDIUM confidence)
- [Gamification Streaks - Plotline](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps) - 40-60% higher DAU with streaks+milestones (MEDIUM confidence)
- [Geofencing Privacy Best Practices](https://www.iplocation.net/addressing-privacy-challenges-in-mobile-apps-utilizing-geolocation-data) - CCPA/GDPR compliance for location (MEDIUM confidence)
- [expo-share-intent - npm](https://www.npmjs.com/package/expo-share-intent) - Share extension implementation for Expo (HIGH confidence)
- [react-native-nfc-manager - npm](https://www.npmjs.com/package/react-native-nfc-manager) - NFC reading for React Native (HIGH confidence)
- [Mobile App Onboarding 2026 - VWO](https://vwo.com/blog/mobile-app-onboarding-guide/) - 77% Day 3 drop-off, 3-7 step max (MEDIUM confidence)
