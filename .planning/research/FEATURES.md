# Feature Landscape

**Domain:** Two-sided fan-performer live music engagement platform
**Researched:** 2026-03-06
**Confidence:** MEDIUM-HIGH

## Table Stakes

Features users expect. Missing = product feels incomplete or untrustworthy.

### Fan-Facing

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| QR scan to instant capture (no app install) | HelloBand, BandLink, NoSongRequests all do this. Fans will not download an app at a show. Mobile web is the only viable first-touch. | Low | Already scoped in PRD. Under 5 seconds or fans abandon. |
| Email-only identification (no account creation) | Every competitor (Laylo, HelloBand, BandLink) uses single-field email capture. A signup form kills conversion at a loud venue. | Low | Email is the identifier. No password, no username. |
| Confirmation screen with scan count | Fans need instant feedback that something happened. "You collected X. Scans: 3." Without this, it feels broken. | Low | Show tier badge and color. |
| Repeat scan handling (no duplicates) | Fans will re-scan. If they get an error or duplicate entry, trust is broken. Must show updated tier gracefully. | Low | Upsert into fan_tiers, unique constraint on collections per day. |
| OG meta tags / social sharing preview | When fans share the collect URL on Instagram/Twitter, it must render a branded card. A blank link preview = missed organic growth. | Low | Dynamic OG images via Next.js generateMetadata + og image route. |
| Fan profile / passport page | Concert Archives (featured in NYT), Concerts Remembered, Momento all prove fans want a record of shows attended. Without a "my collections" view, the scan feels pointless. | Medium | Collected artists, tier badges, scan history. Login via magic link or email lookup. |
| Performer public profile | Pre-built from scraped data. Already exists at `/artist/[slug]`. This is table stakes because it's what the QR code points through to. | Low | Already built. |

### Performer-Facing

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Fan count + tier breakdown | Every competitor shows audience size. Laylo shows total fans, segments. NoSongRequests shows page visit analytics. Without this, performer has no reason to use the platform. | Low | Aggregate query on fan_tiers. |
| Fan list (searchable, filterable by tier) | Laylo, HelloBand, NoSongRequests all let performers browse their fan list. This is the core value prop -- "own your audience." | Medium | Search by name/email, filter by tier, sort by scan count. |
| QR code download (print-ready) | NoSongRequests, HelloBand, BandLink all provide downloadable QR codes. DJs print these for merch tables, booth setups, flyers. | Low | PNG at 300 DPI. Already have `/api/qr/[slug]`. |
| Magic link auth (no password) | Supabase magic link is the right choice. Performers won't remember a password for a new platform. NoSongRequests uses email/password which is friction. | Low | Supabase Auth handles this natively. |
| Profile claiming flow | Performer verifies they own the pre-built profile. Critical for trust -- "how do you have my data?" is the first question. Clear claiming UX defuses this. | Medium | Email verification matching known contact, or manual approval. |
| Basic message composer | Laylo, HelloBand, FanCircles all have messaging. Performers expect to be able to reach their fans. Even if delivery is stubbed for v1, the compose + preview UX must exist. | Medium | Select tier target, write subject + body, preview. Stub delivery for v1. |

## Differentiators

Features that set Decibel apart. Not expected by users, but create competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Verified physical attendance** | NO competitor does this. Laylo captures "interest" (drop signups). NoSongRequests captures "engagement" (song requests). FanCircles captures "follows." Decibel captures verified dancefloor presence. This is the core differentiator. | Low (QR captures this inherently) | The collection record IS the proof. capture_method + venue + date = verified. |
| **Tiered access system (1/3/5/10+)** | Gamification that rewards repeat attendance. Concert Archives tracks attendance but doesn't reward it. Momento collects but doesn't unlock. Decibel turns attendance into escalating access. | Medium | network (1) -> early_access (3) -> secret (5) -> inner_circle (10+). Must be visible to fans and performers. |
| **Pre-built performer profiles from scraped data** | Every performer has a profile before they know Decibel exists. NoSongRequests requires performers to sign up first. Laylo requires artist onboarding. Decibel flips the script: the profile exists, the performer just claims it. 429 profiles already in DB. | Already done | This is the growth hack. Outreach says "we already built your page." |
| **Performer-owned audience (not platform-owned)** | Laylo owns the fan data and charges for access. Instagram/TikTok own the algorithm. Decibel gives performers direct ownership of their verified fan list. Exportable. Portable. | Low | Allow CSV export of fan list. This is a trust signal. |
| **Scans-over-time chart** | Visual proof of audience growth. Booking agents and promoters care about trajectory, not just total count. "Show me your growth" is a booking conversation. | Medium | Last 90 days, grouped by week. Chart.js or recharts. |
| **"Go Live" button** | Real-time status showing "DJ X is live at Smartbar right now." No competitor surfaces live performance status. Opens door to "who's playing near me right now?" discovery. | Medium | Select venue from list, toggle live status. Could auto-expire after 6 hours. |
| **Underground aesthetic** | Every competitor looks corporate (NoSongRequests, Laylo, HelloBand). Decibel's Nerve-movie dark aesthetic signals "this is for the underground, not wedding DJs." Design IS a feature for this audience. | Already done | Maintain the dark brand. Never go light/corporate. |

## Anti-Features

Features to explicitly NOT build. These seem obvious but would hurt the product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Song request system** | NoSongRequests' core feature. Wrong audience -- Decibel targets underground DJs who play curated sets, not wedding DJs taking requests. Song requests would repel the target market. | Focus on fan collection and tiered access. The value is audience ownership, not crowd interaction during sets. |
| **Digital tipping** | NoSongRequests and HelloBand monetize through tips. Underground DJs get paid by promoters, not tips from the crowd. Tips feel corporate/wedding. | If monetization needed later, charge performers for premium dashboard features (analytics, export, messaging volume). Never charge fans. |
| **In-app merch store** | FanCircles bundles merch. Adds massive complexity (inventory, payments, fulfillment). Underground DJs sell merch at the table or on Bandcamp. | Link out to existing merch (Bandcamp, etc). Don't build commerce. |
| **Streaming / music playback** | Laylo integrates with Spotify/Apple Music. Decibel is about physical attendance, not streaming. Building a music player dilutes the core value prop. | Embed SoundCloud widget (already done). Link to streaming platforms. Don't build playback. |
| **Social feed / timeline** | FanCircles builds "superfan apps" with social features. Social feeds are engagement traps that require constant content. Underground DJs post on Instagram, not a niche platform. | Keep it transactional: scan, collect, unlock tiers, get messages. |
| **Complex onboarding wizard** | Multi-step onboarding kills performer adoption. HelloBand requires app download + setup. | One-click magic link -> auto-claim pre-built profile. Minimal friction. |
| **Fan-to-fan social features** | Building a social network is a different product. Community features need critical mass Decibel won't have early. | Fans interact with performers, not each other. Keep the graph one-directional. |
| **Push notifications (v1)** | Requires mobile app or wallet pass infrastructure. FanCircles does this via PushPass wallet passes. Too complex for v1 web-only. | Email messaging for v1. Push notifications when mobile app ships. |
| **Real-time chat during sets** | HelloBand lets fans message performers on stage. Underground DJs are mixing, not reading messages. This would be ignored and feel broken. | No live interaction. The interaction is: scan QR -> collect -> unlock tiers. Async messages from performer to fans only. |

## Feature Dependencies

```
QR Code Generation -> Fan Capture Page (capture page needs QR pointing to it)
Fan Capture Page -> Fan Tiers (tiers computed from collections)
Fan Capture Page -> Fan Profile (profile shows collections)
Performer Auth (magic link) -> Performer Dashboard (dashboard requires auth)
Performer Auth -> Profile Claiming (claiming requires verified identity)
Fan Capture Page -> Performer Dashboard (dashboard shows fan data from captures)
Fan Tiers -> Message Composer (messages target tiers)
Message Composer -> Message Delivery (compose first, deliver later)
Performer Dashboard -> Scans Chart (chart is a dashboard component)
Performer Dashboard -> Go Live (go live is a dashboard action)
Performer Dashboard -> QR Download (download from dashboard)
Performer Dashboard -> Fan List Export (export from dashboard)
```

Dependency chain (critical path):
```
Performer Auth -> Profile Claiming -> Dashboard -> Fan List + Chart + Messages + QR Download + Go Live
                                                     |
Fan Capture Page -> Collections -> Fan Tiers --------+
                                      |
                                      v
                                 Fan Profile
```

## MVP Recommendation

### Must Ship (Demo-Ready)

1. **Fan Capture Page** (`/collect/[slug]`) -- the entire product hinges on this. Email input, collect, tier display, repeat scan handling. This is Decibel's "aha moment."
2. **QR Code Generation** -- performers need a way to get their QR code. Even a simple `/api/qr/[slug]` endpoint that returns a PNG.
3. **Performer Auth + Claiming** -- magic link login, claim pre-built profile. Without this, the dashboard is inaccessible.
4. **Performer Dashboard (basic)** -- fan count, tier breakdown, fan list. This is the "why should I use this?" answer for performers.
5. **Fan Profile (basic)** -- collected artists, tier badges. This is the "why should I scan again?" answer for fans.

### Ship Next (Post-Demo)

6. **Message Composer** -- compose + preview + tier targeting. Delivery can be stubbed.
7. **Scans-over-time chart** -- visual proof of growth. Recharts or Chart.js.
8. **Go Live button** -- real-time status. Cool demo feature but not blocking core loop.
9. **QR code download as branded PNG** -- print-ready version with Decibel branding.
10. **OG meta tags** -- social sharing previews for viral growth.

### Defer

- **Fan list CSV export** -- important for trust but not demo-critical
- **Fan settings / account management** -- low priority until real users exist
- **Message delivery (SendGrid)** -- stub for v1, real delivery when performers actually have fans
- **Location-based passive detection** -- requires mobile app (out of scope)
- **Email receipt parsing** -- requires integrations with AXS/DICE/Eventbrite (future milestone)

## Sources

- [NoSongRequests.com](https://nosongrequests.com/) -- 16K performers, QR-based song requests + tips + fan capture. Wedding/corporate DJ focus. (MEDIUM confidence)
- [Laylo](https://laylo.com/) -- Drop platform, fan data capture, enriched profiles, segmented messaging. Label/agency focused. (HIGH confidence)
- [HelloBand](https://helloband.io/) -- QR-based fan engagement for performers: messaging, tipping, email list. (MEDIUM confidence)
- [BandLink](https://bandlink.click/) -- QR-powered signup pages syncing to Mailchimp/Klaviyo. Simple. (MEDIUM confidence)
- [FanCircles / PushPass](https://www.fancircles.com/) -- Wallet pass platform for direct-to-fan notifications, no app required. (MEDIUM confidence)
- [Concert Archives](https://www.concertarchives.org/) -- Fan-side concert history tracking, featured in NYT. (MEDIUM confidence)
- [Concerts Remembered](https://concertsremembered.com/) -- Visual concert collection gallery, milestone tracking. (LOW confidence)
- [Momento](https://www.acmomento.com/) -- Sports/music attendance scrapbook with personalized collectibles. (LOW confidence)
- [CrowdPass/CrowdSync](https://www.crowdpass.co/) -- LED wristbands with QR codes for live event fan capture. (LOW confidence)
- [MusicBizQR](https://musicbizqr.com/) -- QR code strategy guides for musicians. (LOW confidence)
