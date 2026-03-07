# Milestones

## v1.2 Polish, Map, and Pipeline Fixes (Shipped: 2026-03-07)

**Phases:** 8-10 (3 phases, 5 plans)
**Timeline:** 2026-03-06 to 2026-03-07

**Key accomplishments:**
- Bug fixes: Instagram handle normalization, fan count display, empty section hiding, leaderboard display names
- Interactive Scene Map at `/map` with dark CartoDB tiles, venue markers, genre filtering, "Tonight" mode
- Scraper pipeline cleanup: event-name-as-artist entries removed, 19hz.info scraper added
- Venue geocoding via Nominatim OSM

**Archive:** `phases/08-bug-fixes/`, `phases/09-scene-map/`, `phases/10-scraper-pipeline/`

---

## v1.1 Growth Mechanics + Content Engine (Shipped: 2026-03-06)

**Phases:** 5-7 (3 phases, 5 plans)
**Timeline:** 2026-03-06 (single session)

**Key accomplishments:**
- Shareable fan collection cards at `/fan/[id]/card` with dynamic 1200x630 OG image generation
- Copy-to-clipboard + Share on X integration for viral fan sharing
- Public leaderboard at `/leaderboard` with podium UI, fan/performer tabs, weekly/monthly/all-time filters
- Content generator pipeline: DJ Spotlight, Scene Roundup, Product Teaser (React -> Playwright -> 1080x1080 PNG)
- Weekly batch generator producing 5-7 branded Instagram posts in dated output directories

**Known Gaps:**
- DASH-01 through DASH-05, DASH-08, DASH-09: v1.0 dashboard requirements unchecked in tracking (features were built but checkboxes not updated during v1.0)

**Archive:** `milestones/v1.1-ROADMAP.md`, `milestones/v1.1-REQUIREMENTS.md`

---

## v1.0 MVP (Shipped: 2026-03-06)

**Phases:** 1-4 (4 phases, 8 plans)

**Key accomplishments:**
- Performer auth with magic link + secure claim flow
- RLS policies for collections, fan_tiers, messages
- QR-based fan capture with tier progression (network -> early_access -> secret -> inner_circle)
- Performer dashboard with fan analytics, messaging (draft mode), go-live toggle
- Fan profile with collection grid, scan history, settings
- Motion animations + toast notifications throughout
- Full dark underground aesthetic with brand design tokens

---
