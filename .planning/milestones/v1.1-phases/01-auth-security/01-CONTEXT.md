# Phase 1: Auth & Security - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Performers can securely authenticate via magic link, sessions persist, dashboard routes are protected, performer claim flow verifies identity, and RLS policies enforce row-level access on collections/fan_tiers/messages. This phase does NOT include fan auth (Phase 4) or dashboard UI features (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Auth Strategy
- Magic link via Supabase OTP — already working in login-form.tsx
- Session persists via @supabase/ssr cookie-based server client — already set up
- Auth callback at /auth/callback exchanges code for session and redirects to /dashboard
- No changes needed to the core auth flow — it works. Focus is on security hardening.

### Route Protection
- Use Next.js middleware to protect /dashboard routes — redirect to /auth/login if no session
- Middleware checks Supabase session via server client
- Public routes that must NOT be protected: /, /artist/[slug], /collect/[slug], /auth/*

### Claim Flow Security
- CRITICAL FIX: /api/claim currently accepts user_id from form data — anyone can claim any profile
- Fix: Extract user_id from the authenticated Supabase session server-side, ignore form-submitted user_id
- The claim prompt in dashboard/page.tsx passes user_id as hidden form field — remove this
- Add session verification: only the authenticated user's ID is used for claiming

### RLS Policies
- RLS is enabled on all tables but policies only exist for public reads on performers/venues/events
- Dashboard queries collections, fan_tiers, fans via createSupabaseServer() (respects RLS) — these return empty without policies
- Strategy: Use admin client (service role) for dashboard server queries instead of adding complex per-user RLS policies
- Rationale: Dashboard page.tsx already uses server-side data fetching with auth check — admin client after auth verification is equivalent to RLS but simpler
- collections, fan_tiers, messages: queries filter by performer_id already — auth check + admin client is sufficient for v1

### Logout
- Add logout functionality — Supabase signOut() + redirect to /auth/login
- Available from dashboard header/nav

### Claude's Discretion
- Middleware implementation details (matcher patterns, edge runtime)
- Error page design for unauthorized access
- Session refresh strategy

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase-server.ts`: Server client with cookie-based auth — working, no changes needed
- `src/lib/supabase-browser.ts`: Browser client for client components — used in login-form.tsx
- `src/lib/supabase-admin.ts`: Admin/service role client — already exists, use for dashboard queries
- `src/app/auth/login/login-form.tsx`: Working magic link form with OTP, error handling, sent state
- `src/app/auth/callback/route.ts`: Working code-to-session exchange

### Established Patterns
- Server components fetch data, client components handle interactivity
- API routes use createSupabaseAdmin() for writes
- Dashboard page.tsx already checks auth with getUser() and redirects if no user
- Claim prompt renders inline when no performer is claimed

### Integration Points
- Dashboard page.tsx line 12: `if (!user) redirect("/auth/login")` — already redirects
- But this happens AFTER the page renders server-side — middleware would catch it earlier
- /api/claim at line 8: `const userId = formData.get("user_id") as string` — the security hole
- ClaimPrompt at line 143: passes user_id as hidden field — needs removal

</code_context>

<specifics>
## Specific Ideas

- Dashboard queries should switch from createSupabaseServer() to createSupabaseAdmin() after auth verification — this sidesteps the RLS issue entirely while maintaining security
- The existing auth flow (magic link → callback → dashboard redirect) is solid — don't break it
- Logout should be a simple button in the dashboard header, not a separate page

</specifics>

<deferred>
## Deferred Ideas

- Fan auth via magic link — Phase 4
- Role-based routing in callback (performer vs fan) — Phase 4
- Custom SMTP for magic link deliverability — post-launch if needed
- Granular RLS policies per user — not needed while using admin client with server-side auth check

</deferred>

---

*Phase: 01-auth-security*
*Context gathered: 2026-03-06*
