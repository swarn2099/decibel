# Research Summary: Decibel — Fan Capture + Dashboard + Profiles

**Domain:** Two-sided live music fan-performer engagement platform
**Researched:** 2026-03-06
**Overall confidence:** HIGH

## Executive Summary

Decibel's next milestone builds the core product loop: fans scan QR codes at venues, collect performers via email, progress through tiers, and see their collection grow. Performers claim pre-built profiles, access dashboards with fan analytics, manage fan lists, and compose messages. The existing codebase (Next.js 16, React 19, Supabase, Tailwind 4) with 429 performers, 474 events, and 68 venues already in production provides a strong foundation.

The stack additions are minimal: four new packages (recharts, motion, sonner, date-fns) cover charting, animations, toast feedback, and date formatting. Everything else is already installed or handled natively by Supabase (auth, RLS, realtime). No new infrastructure is needed. The architecture follows the existing server-component-first pattern with API routes for mutations.

The most critical risks are: QR codes failing in dark venue lighting, the performer claim flow having no identity verification (anyone could claim any profile), Supabase magic link emails landing in spam, and RLS policies blocking dashboard queries (policies exist for public tables but not for collections/fan_tiers/messages). All are addressable but must be handled before any performer demo.

The dual auth model (performers authenticate via magic link, fans just provide an email) is the right call for v1 but creates data quality risks. Email typos create orphan fan records. This is an acceptable tradeoff for demo speed, but merge tooling should be planned for post-launch.

## Key Findings

**Stack:** Add recharts 3.7.0, motion 12.35.0, sonner 2.0.7, date-fns 4.x. Four packages total. No state management, form libraries, or UI component libraries needed.

**Architecture:** Server components for data fetching, client components for interactivity, API routes with admin client for writes. Dual auth: Supabase magic link for performers, email-only identification for fans. Single auth callback with role detection for routing.

**Critical pitfall:** The performer claim flow (`/api/claim`) accepts any user_id + performer_id without verification. Must be locked down before any performer sees the product. Also: RLS policies are missing for collections/fan_tiers/messages tables, which will cause the dashboard to return empty data.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Auth + Security Hardening** - Fix claim flow verification, implement middleware, add missing RLS policies
   - Addresses: Performer auth, protected routes, claim security
   - Avoids: Identity theft pitfall, empty dashboard pitfall (RLS)
   - Rationale: Everything downstream depends on auth working correctly

2. **Fan Capture Flow** - Complete `/collect/[slug]` with email capture, tier display, repeat scan handling, OG tags
   - Addresses: Core product loop, the "aha moment"
   - Avoids: Ghost accounts (email normalization), dark venue QR failure (high-contrast codes)
   - Rationale: This is what performers will test first -- "does the QR code work?"

3. **Performer Dashboard** - Stats cards, fan list, scan chart, message composer, QR download, Go Live
   - Addresses: Performer value prop ("why should I use this?")
   - Avoids: Empty state confusion (intentional empty states), stubbed messaging confusion (label as draft/preview)
   - Rationale: Depends on capture flow producing data; is the demo centerpiece

4. **Fan Profile + Settings** - Collection grid, tier badges, scan history, account management, logout
   - Addresses: Fan retention ("why should I scan again?")
   - Avoids: Data privacy leaks (scope all queries to authenticated fan)
   - Rationale: Fan-side is secondary to performer-side for demo; can ship after dashboard

**Phase ordering rationale:**
- Auth must come first because dashboard and fan profile both require it
- Fan capture before dashboard because dashboard needs collection data to display
- Dashboard before fan profile because performers are the revenue side and need to be demo-ready first
- Fan capture and dashboard are on the critical path; fan profile is a parallel track that can lag

**Research flags for phases:**
- Phase 1 (Auth): Likely needs testing of magic link deliverability to Gmail/Outlook before demo
- Phase 2 (Capture): Needs real-world QR testing in low-light conditions
- Phase 3 (Dashboard): Standard patterns, unlikely to need research. RLS policy setup is the main risk
- Phase 4 (Fan Profile): Standard patterns, no research flags

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm, React 19 compatibility confirmed, minimal additions |
| Features | HIGH | Clear table stakes from competitor analysis, well-defined PRD, features already scoped |
| Architecture | HIGH | Extends existing patterns already working in production, no new infrastructure |
| Pitfalls | HIGH | Based on direct codebase analysis, known Supabase behaviors, and venue environment realities |

## Gaps to Address

- **Magic link deliverability:** Must test before demo. If Supabase default email fails, configure custom SMTP (Resend or SendGrid). This is a Phase 1 validation task.
- **RLS policies for collections/fan_tiers/messages:** Missing from current schema. Either add policies or use admin client for dashboard server queries. Must decide during Phase 1.
- **Fan account merge tooling:** Email typos will create duplicates. Not blocking for demo, but plan tooling for post-launch.
- **Recharts + React 19 peer deps:** May need `--legacy-peer-deps` flag at install time. Check during Phase 1 setup.
