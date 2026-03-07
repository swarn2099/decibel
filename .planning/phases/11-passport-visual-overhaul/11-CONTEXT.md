# Phase 11: Passport Visual Overhaul - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning
**Source:** PRD Express Path (DECIBEL_V2_PRD.md)

<domain>
## Phase Boundary

Transform the fan profile/passport page from a basic list into a rich, visual, shareable experience. This is the hero screen — every design decision should make someone want to screenshot their passport and share it.

Two collection types must be visually distinct:
- **Verified (in-person)**: Location-confirmed attendance. Counts toward tier progression. Full color, solid badge, tier indicator, "verified" glow.
- **Discovered (online)**: Fan found artist online. Does NOT count toward tiers. Muted style, outline badge, "discovered" tag.

The passport tells a story: "I discovered DJ Molinari online in January. I collected them in-person for the first time in February. By June I was inner circle."

</domain>

<decisions>
## Implementation Decisions

### Passport Layout
- Header: fan name, city, member since date, total stats (X artists collected, Y verified, Z shows attended, W venues visited)
- Visual timeline: scrollable showing collections in chronological order
- Each entry: artist photo, artist name, venue, date, capture method icon (QR/NFC/location/online), verified vs discovered badge
- Verified = visually prominent (full color, solid badge, tier indicator with pink/purple/blue/teal brand colors)
- Discovered = visually lighter (muted, outline badge, "discovered" tag)
- Tier badges per artist: network/early_access/secret/inner_circle

### Stats Dashboard ("Your Year in Sound")
- Always visible (not just year-end)
- Metrics: total dancefloors, cities, unique verified artists, unique discovered artists, most-collected artist (with count), most-visited venue, favorite genre (inferred), streak (consecutive weeks with verified collection)
- Stats should be visually bold — large numbers, brand colors, designed to screenshot

### Shareable Passport Card
- "Share My Passport" button generates 1080x1920 story-ready image
- Dark background, Decibel branding
- Fan's top stats, top 3-5 artists with photos, tier badges
- QR code or deep link to public passport
- Card variants: full passport summary, single-artist highlight, year-in-review
- Share sheet: Instagram Stories, iMessage, copy link, Twitter/X

### Public Passport View
- Route: /passport/[fan-slug]
- Publicly viewable (no login required to view, login required to create)
- Shows collection timeline, stats, and badges
- OG meta tags generate preview card showing stats
- This is the URL fans put in their Instagram bio

### Claude's Discretion
- Timeline layout choice (horizontal scroll vs vertical scroll vs grid)
- Fan slug generation strategy (username-based or hash-based)
- Image generation approach (React component -> Playwright screenshot vs canvas API vs server-side)
- How to handle fans with zero collections (empty state design)
- Stats calculation queries (server-side vs client-side aggregation)
- Whether to add the "discovered" collection type to the DB schema now or stub it for Phase 12

</decisions>

<specifics>
## Specific Ideas

- Design aesthetic: Nerve movie vibe — dark backgrounds (#0B0B0F), pink/purple/blue/teal accents
- Font: Poppins (headers bold, body regular)
- Verified > Discovered visually. Always. The hierarchy must make in-person collections feel special.
- Stats should be "Instagram story worthy" — large typography, bold numbers, brand gradient accents
- OG image should show enough to be intriguing but drive clicks to the full passport
- The passport should feel alive, not a static data table

</specifics>

<deferred>
## Deferred Ideas

- Badge display on passport (Phase 13)
- Activity feed (Phase 15)
- Follower/following counts on passport (Phase 15)
- Card variants beyond basic passport summary (Phase 15 — SOCL-01 covers enhanced card types)

</deferred>

---

*Phase: 11-passport-visual-overhaul*
*Context gathered: 2026-03-07 via PRD Express Path*
