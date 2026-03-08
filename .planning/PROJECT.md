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

#### React Native Mobile App
- [ ] Expo project with tab navigation, auth, design system, Supabase connection
- [ ] Home feed with upcoming events, featured artists, pull-to-refresh
- [ ] Artist profile screens with Collect/Discover flows
- [ ] Rich passport with stamps, badges, stats, shareable cards
- [ ] Search + add artist with Spotify search and founder badge
- [ ] Location-based venue detection and collection prompting
- [ ] Native map with dark theme, venue markers, genre filters
- [ ] Push notifications (nearby events, badges, tier-ups, friend activity)
- [ ] Polish, animations, offline support, App Store submission

## Current Milestone: v3.0 — Decibel Mobile

**Goal:** Build the React Native (Expo) mobile app that mirrors the web experience and adds native capabilities: location-based collection, push notifications, and share extension.

**Target features:**
- Home feed with upcoming events and artist discovery
- Artist profiles with Collect/Discover CTAs
- Rich passport with stamp-style collections, badges, stats, and shareable cards
- Search + add artist from Spotify with founder badge
- Location-based venue detection and auto-collection prompting
- Native dark-themed scene map with venue markers
- Push notifications for nearby events, badge unlocks, friend activity
- App Store-ready polish with animations, offline support, and TestFlight

### Out of Scope

- SMS OTP auth — future milestone
- Email receipt parsing (AXS, DICE, Eventbrite) — future milestone
- Real-time fan count via Supabase Realtime — nice-to-have
- SendGrid email delivery for messages — stubbed for now, real delivery later
- Payments/credits — explicitly off per product rules
- Song requests / tipping — anti-features for underground scene
- Background location tracking — foreground only, "While Using" permission
- Apple Music integration — stub UI only ("Coming soon in mobile app")
- Performer dashboard in mobile — web only for now

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
- **Milestones shipped**: v1.0 MVP (Phases 1-4), v1.1 Growth Mechanics (Phases 5-7), v1.2 Polish/Map/Pipeline (Phases 8-10), v2.0 The Passport (Phases 11-15)
- **Mobile app**: `/home/swarn/decibel/mobile/` — Expo project initialized with tab nav, auth, design system (Phase 1 complete)
- **Mobile stack**: React Native + Expo SDK 52+, Expo Router, NativeWind, TanStack Query, Zustand, Supabase (shared DB)

## Constraints

- **Tech stack (web)**: Next.js 15, TypeScript, Tailwind, Supabase — established
- **Tech stack (mobile)**: React Native, Expo SDK 52+, Expo Router, NativeWind, TanStack Query, Zustand — established in Phase 1
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
| React Native + Expo for mobile | Shared TypeScript codebase, Expo Router mirrors Next.js patterns, EAS for builds | ✓ Good |
| Shared Supabase backend | Same DB, same auth, same APIs — no backend duplication | ✓ Good |
| NativeWind for mobile styling | Tailwind patterns carry over from web, same design tokens | ✓ Good |
| Foreground-only location | "While Using" permission only, no background tracking — privacy-first | ✓ Good |

---
*Last updated: 2026-03-08 after v3.0 milestone start*
