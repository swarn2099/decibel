# Decibel

## What This Is

Decibel is a two-sided platform connecting live performers (DJs, producers, live acts) with fans who were physically on their dancefloor. For fans, it's a live music passport with tiered access rewards — the more shows you attend, the more you unlock. For performers, it's verified audience ownership with direct messaging, analytics, and booking leverage. Chicago-first, underground music scene aesthetic.

## Core Value

Fans can scan a QR code at a live show and instantly collect that performer — no app install, no friction — building a verified attendance record that unlocks tiered access rewards.

## Requirements

### Validated

- ✓ Next.js 15 + TypeScript + Tailwind project setup — Phase 0
- ✓ Supabase database schema (performers, fans, venues, events, collections, fan_tiers, messages) — Phase 1
- ✓ Event-based scraper pipeline (EDMTrain → SoundCloud enrichment) — Phase 4
- ✓ 429 performers, 474 events, 68 venues in production DB — Phase 4
- ✓ Instagram content generator (spotlight, roundup, teaser, weekly batch) — Phase 5
- ✓ Outreach agent (target selection, message generator, follow-ups) — Phase 6
- ✓ Public artist profile pages (`/artist/[slug]`) with SoundCloud embed, upcoming shows — Bonus
- ✓ Homepage with performer grid and search bar — Bonus
- ✓ Dark underground aesthetic (Nerve movie vibe) with brand design tokens — Phase 0

### Active

- [ ] Fan capture page (`/collect/[slug]`) — full email → collect → tier upgrade flow
- [ ] QR code generation endpoint (`/api/qr/[slug]`) — verified working
- [ ] Repeat scan handling — show updated tier, no duplicate collections
- [ ] OG meta tags for social sharing on collect page
- [ ] Performer dashboard (`/dashboard`) — fan count, tier breakdown, recent scans
- [ ] Performer auth via Supabase magic link (infrastructure done, needs live test)
- [ ] Performer profile claiming flow (secured in Phase 1)
- [ ] Fan list with search/filter by tier on dashboard
- [ ] Scan-over-time chart (last 90 days) on dashboard
- [ ] Message composer — select tier, write, preview, send
- [ ] QR code download as print-ready PNG from dashboard
- [ ] "Go Live" button — mark performer as live at a venue
- [ ] Fan profile page — logged-in fans see collected artists, tier badges, scan history
- [ ] Fan settings page — account management
- [ ] Logout functionality for both fans and performers (performer logout done in Phase 1)
- [ ] Demo/production readiness — all flows working end-to-end

### Out of Scope

- React Native mobile app — not in PRD phases, future milestone
- SMS OTP auth — future milestone
- Location-based passive detection — future milestone (requires mobile app)
- Email receipt parsing (AXS, DICE, Eventbrite) — future milestone
- Real-time fan count via Supabase Realtime — nice-to-have, not blocking v1
- SendGrid email delivery for messages — can stub for v1, real delivery later
- Payments/credits — explicitly off

## Context

- **Database**: 429 performers with rich data (303 photos, 132 bios, 325 follower counts, 97+ genres) from EDMTrain + SoundCloud widget API
- **Deployed**: Live on Vercel at decibel-swarn-singhs-projects.vercel.app
- **Supabase**: Project dgpbzfjsppubzztnszrv, service role key in `.env.local`
- **Existing routes**: `/`, `/artist/[slug]`, `/collect/[slug]`, `/dashboard`, `/auth/login`
- **Existing APIs**: `/api/collect`, `/api/qr/[slug]`, `/api/claim`, `/api/go-live`, `/api/messages`
- **Design tokens**: bg=#0B0B0F, pink=#FF4D6A, purple=#9B6DFF, blue=#4D9AFF, teal=#00D4AA, yellow=#FFD700
- **Font**: Poppins via next/font/google
- **Scraping**: SoundCloud widget API client_id `nIjtjiYnjkOhMyh5xrbqEW12DxeJVnic`, EDMTrain schema.org markup

## Constraints

- **Tech stack**: Next.js 15, TypeScript, Tailwind, Supabase — already established
- **Timeline**: Must be demo/production ready by tomorrow (2026-03-07)
- **Design**: Dark underground aesthetic — no generic AI/corporate looks
- **Fan cost**: Always free. Never charge fans.
- **Capture speed**: QR scan → collection must complete in under 5 seconds, no app install

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

---
*Last updated: 2026-03-06 after Phase 1 (Auth & Security)*
