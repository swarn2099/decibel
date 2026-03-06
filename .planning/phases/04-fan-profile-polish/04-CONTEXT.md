# Phase 4: Fan Profile + Polish - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Fan login via magic link, fan profile page showing collected artists with tier badges, scan history, settings page with display name update and logout, and a final aesthetic/build pass to ensure demo readiness. This phase does NOT include email delivery, push notifications, or mobile app features.

</domain>

<decisions>
## Implementation Decisions

### Fan Auth Flow (AUTH-07)
- Reuse the existing magic link login form (login-form.tsx) — same OTP mechanism works for fans
- The login page currently says "Performer Dashboard" — make it generic ("Sign In") since both fans and performers use it
- Auth callback (/auth/callback) currently always redirects to /dashboard — update to smart redirect: check if user has a claimed performer → /dashboard, otherwise → /profile
- Add /profile and /settings to middleware matcher for route protection
- Fans don't need to be in the performers table — any authenticated Supabase user can have a fan profile
- Fan identity comes from auth.users table; fan data from fans table (email match)

### Fan Profile Page (FAN-01, FAN-02, FAN-03, FAN-04)
- New route: /profile — server component fetches data, passes to client component (same pattern as dashboard)
- Collection grid: card-based layout showing performer photo, name, tier badge, scan count
- Cards link to /artist/[slug] so fans can revisit performer profiles
- Scan history: chronological list showing performer name, venue, date — below the collection grid
- Empty state: "You haven't collected any performers yet. Scan a QR code at your next show to get started."
- Use admin client for queries (same pattern as dashboard) since fan RLS policies aren't applied yet
- Header shows fan email/name, links to settings and logout

### Settings Page (SETT-01, SETT-02, SETT-03, SETT-04)
- New route: /settings — simple form page
- Display name update: text input, save button, calls an API endpoint to update fans.name
- New API route: /api/settings (POST) — updates fan name in fans table by authenticated user email
- Logout button (same pattern as dashboard — signOut + redirect to /)
- Link back to /profile

### Shared Logout (SETT-03)
- Performer logout already works in dashboard header
- Fan logout on settings page + profile header
- Both use same pattern: createSupabaseBrowser().auth.signOut() + router.push

### Aesthetic Pass (DEMO-01, DEMO-02)
- All new pages use bg-bg (#0B0B0F), bg-bg-card for cards, brand color accents
- Tier colors consistent everywhere: pink=network, purple=early_access, blue=secret, teal=inner_circle
- Reuse TIER_COLORS and TIER_LABELS maps from dashboard-client.tsx — extract to shared lib if needed
- Poppins font already applied globally via layout.tsx
- Verify all existing pages maintain consistent dark aesthetic

### Build Verification (DEMO-05)
- npm run build must pass with zero errors after all changes
- Final verification step in last plan

### Claude's Discretion
- Exact card grid layout (2-col mobile, 3-col desktop, etc.)
- Profile header design (simple vs hero-style)
- Whether to extract TIER_COLORS/TIER_LABELS to a shared file or duplicate
- Settings page layout details
- Any minor polish decisions for demo readiness

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `login-form.tsx`: Full magic link auth form — reuse as-is, just update parent page copy
- `dashboard-client.tsx`: TIER_COLORS, TIER_LABELS maps — reuse for fan profile tier badges
- `collect-form.tsx`: TIER_CONFIG with colors/labels/thresholds — reference for consistency
- `middleware.ts`: Route protection pattern — extend matcher to include /profile, /settings
- `auth/callback/route.ts`: Auth code exchange — update redirect logic
- Sonner toast + motion animations available globally
- Lucide icons used throughout

### Established Patterns
- Server component fetches data (admin client), passes to client component
- Dark bg with border-light-gray/10 cards, gradient buttons (pink to purple)
- Auth check: createSupabaseServer() → getUser() → redirect if no user
- Data queries: createSupabaseAdmin() for all reads (bypasses RLS)

### Integration Points
- `fans` table: email, name fields — queried by auth user email
- `collections` table: fan_id, performer_id, created_at — join with performers for display
- `fan_tiers` table: fan_id, performer_id, scan_count, current_tier
- `/auth/callback` — needs smart redirect logic
- `middleware.ts` — needs expanded matcher

</code_context>

<specifics>
## Specific Ideas

- The fan profile should feel like a "passport" — your collection of performers displayed proudly
- Cards should show performer photos prominently (the visual hook)
- Tier badges on cards create the progression incentive ("I need 2 more scans for Secret")
- The profile is what fans would screenshot and share — make it look good even with 1-2 collected artists
- Settings should be minimal — just display name and logout for v1

</specifics>

<deferred>
## Deferred Ideas

- Fan email notifications when collected performer goes live — v2
- Fan collection sharing (public profile URL) — v2
- Fan achievement badges beyond tiers — v2
- Dark/light mode toggle in settings — v2
- Account deletion in settings — v2
- Profile photo upload — v2

</deferred>

---

*Phase: 04-fan-profile-polish*
*Context gathered: 2026-03-06*
