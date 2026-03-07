# Decibel

## What This Is

Decibel is a two-sided platform connecting live performers (DJs, producers, live acts) with fans who were physically on their dancefloor. For fans, it's a live music passport with tiered access rewards — the more shows you attend, the more you unlock. For performers, it's verified audience ownership with direct messaging, analytics, and booking leverage. Chicago-first, underground music scene aesthetic.

## Core Value

Fans can scan a QR code at a live show and instantly collect that performer — no app install, no friction — building a verified attendance record that unlocks tiered access rewards.

## Requirements

### Validated

- ✓ Next.js 15 + TypeScript + Tailwind project setup — v1.0
- ✓ Supabase database schema (performers, fans, venues, events, collections, fan_tiers, messages) — v1.0
- ✓ Event-based scraper pipeline (EDMTrain + RA GraphQL + DICE API) — v1.0
- ✓ 2,164 performers, 5,722 events, 355 venues in production DB — v1.0
- ✓ Public artist profile pages (`/artist/[slug]`) with SoundCloud embed, upcoming shows — v1.0
- ✓ Homepage with performer grid, search bar, "This Weekend" section — v1.0
- ✓ Dark underground aesthetic (Nerve movie vibe) with brand design tokens — v1.0
- ✓ Fan auth flow (magic link login, profile, settings) — v1.0
- ✓ QR-based fan capture with tier progression — v1.0
- ✓ Performer dashboard with fan analytics, messaging, go-live — v1.0
- ✓ Performer auth (magic link + claim flow with session identity) — v1.0
- ✓ RLS policies for collections, fan_tiers, messages — v1.0
- ✓ Shareable fan collection card (`/fan/[id]/card`) with OG image generation — v1.1
- ✓ Copy-to-clipboard share button + Share on X (Twitter intent) — v1.1
- ✓ Public leaderboard with fan/performer rankings and time filters — v1.1
- ✓ Content generator pipeline (DJ Spotlight, Scene Roundup, Product Teaser) — v1.1
- ✓ Weekly batch generator producing 5-7 branded Instagram posts — v1.1

### Active

#### Passport Visual Overhaul
- [ ] Rich passport layout with timeline, stats dashboard, tier badges
- [ ] "Your Year in Sound" stats section (dancefloors, cities, artists, streaks)
- [ ] Shareable 1080x1920 story-ready passport card generation
- [ ] Public passport page at /passport/[fan-slug] with OG meta tags

#### Online Discovery
- [ ] Add artist from link (Spotify, SoundCloud, RA, Instagram, TikTok)
- [ ] Auto-scraping pipeline for artists not yet in database
- [ ] Spotify OAuth integration importing top artists as discoveries
- [ ] Smart recommendations based on collection + listening data

#### Badges and Gamification
- [ ] Discovery badges (Trailblazer, First 100, First 10 Verified)
- [ ] Attendance badges (Regular, Devotee, Inner Circle, Venue Local/Legend)
- [ ] Exploration badges (Genre Explorer, City Hopper, Night Owl, Scene Veteran, Centurion)
- [ ] Streak badges (On Fire, Unstoppable, Year-Round)
- [ ] Social badges (Tastemaker, Connector)
- [ ] Badge display with rarity tiers, unlock animations

#### Enhanced Artist Profiles
- [ ] Profile enrichment (top tracks, fan stats, similar artists, past shows)
- [ ] Spotify/SoundCloud embeds on profiles
- [ ] Distinct "Collect" vs "Discover" CTAs
- [ ] Artist claim flow (magic link + SoundCloud/Spotify verification)

#### Passport Sharing and Social
- [ ] Shareable cards (single-artist, milestone, badge, discovery, stats)
- [ ] Activity feed showing friend collections, discoveries, badges
- [ ] Follow system (follow/unfollow, mutual followers)
- [ ] Contact-based "someone you know joined" notifications

## Current Milestone: v2.0 — The Passport

**Goal:** Transform the fan passport into a rich, visual, shareable experience that fans screenshot and post — the hero screen of the entire product.

**Target features:**
- Passport visual overhaul with timeline, stats, and public shareable URL
- Online discovery + add artists from any link + Spotify integration
- Badge system rewarding attendance, discovery, streaks, and social activity
- Enhanced artist profiles with distinct Collect vs Discover flows
- Passport sharing with story-ready cards, activity feed, and follow system

### Out of Scope

- React Native mobile app — not in current scope, future milestone
- SMS OTP auth — future milestone
- Location-based passive detection — future milestone (requires mobile app)
- Email receipt parsing (AXS, DICE, Eventbrite) — future milestone
- Real-time fan count via Supabase Realtime — nice-to-have
- SendGrid email delivery for messages — stubbed for now, real delivery later
- Payments/credits — explicitly off per product rules
- Song requests / tipping — anti-features for underground scene

## Context

- **Codebase**: ~7,200 LOC TypeScript/TSX
- **Database**: 2,164 performers, 5,722 events, 355 venues (EDMTrain + RA + DICE scrapers)
- **Deployed**: Live on Vercel at decibel-swarn-singhs-projects.vercel.app
- **Supabase**: Project dgpbzfjsppubzztnszrv, service role key in `.env.local`
- **Routes**: `/`, `/artist/[slug]`, `/collect/[slug]`, `/dashboard`, `/profile`, `/settings`, `/leaderboard`, `/fan/[id]/card`, `/auth/login`
- **APIs**: `/api/collect`, `/api/qr/[slug]`, `/api/claim`, `/api/go-live`, `/api/messages`, `/api/settings`
- **Content pipeline**: `scripts/content/` — spotlight, roundup, teaser generators + weekly batch
- **Scrapers**: `scripts/scrapers/` — EDMTrain, RA GraphQL, DICE API, SoundCloud enrichment
- **Design tokens**: bg=#0B0B0F, pink=#FF4D6A, purple=#9B6DFF, blue=#4D9AFF, teal=#00D4AA, yellow=#FFD700
- **Font**: Poppins via next/font/google
- **Milestones shipped**: v1.0 MVP (Phases 1-4), v1.1 Growth Mechanics (Phases 5-7), v1.2 Polish/Map/Pipeline (Phases 8-10)

## Constraints

- **Tech stack**: Next.js 15, TypeScript, Tailwind, Supabase — established
- **Design**: Dark underground aesthetic — no generic AI/corporate looks
- **Fan cost**: Always free. Never charge fans.
- **Capture speed**: QR scan -> collection must complete in under 5 seconds, no app install

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| EDMTrain as primary event source | RA/DICE/Google all block scraping; EDMTrain has schema.org markup | ✓ Good |
| SoundCloud widget API for enrichment | No auth needed, returns avatar/bio/followers | ✓ Good |
| Email as fan identifier (no account required) | Minimal friction for first-time scan | — Pending |
| Supabase magic link for performer auth | No password management, fits the vibe | ✓ Good |
| Admin client for dashboard queries | Bypasses RLS, simpler than per-user policies with server-side auth check | ✓ Good |
| Session-based identity in /api/claim | Never trust form-submitted user_id | ✓ Good |
| Stub message delivery for v1 | Real SendGrid integration adds complexity, not needed for demo | — Pending |
| Inline createClient in OG image route | supabase-admin.ts uses server-only, incompatible with Edge runtime | ✓ Good |
| System sans-serif in OG images | Avoids Poppins font fetch failures, simpler | ✓ Good |
| Pre-fetch all leaderboard time periods server-side | Instant client-side toggle, no loading states | ✓ Good |
| Optional outputDir param on content generators | Keeps standalone usage unchanged while enabling batch orchestration | ✓ Good |
| RA GraphQL + DICE API for event scraping | 5x more events than EDMTrain alone, no Playwright needed | ✓ Good |

---
*Last updated: 2026-03-07 after v2.0 milestone start*
