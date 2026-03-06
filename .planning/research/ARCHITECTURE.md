# Architecture Patterns

**Domain:** Two-sided live music fan-performer platform
**Researched:** 2026-03-06
**Confidence:** HIGH (based on existing codebase analysis + Supabase/Next.js 15 patterns)

## Current Architecture (As-Built)

The app already has a clear server-component-first architecture with three Supabase client types. Here is how the existing pieces fit together and how new features should extend them.

```
                     +--------------------------+
                     |      Vercel (Edge)       |
                     |                          |
                     |  middleware.ts            |
                     |  (auth guard: /dashboard) |
                     +------------+-------------+
                                  |
                     +------------v-------------+
                     |   Next.js 15 App Router  |
                     |                          |
  PUBLIC PAGES       |  /                       |  (homepage, SSR)
  (no auth)          |  /artist/[slug]          |  (performer profile, SSR)
                     |  /collect/[slug]         |  (fan capture, SSR + client form)
                     |                          |
  PERFORMER AUTH     |  /auth/login             |  (magic link form, client)
                     |  /auth/callback          |  (code exchange, redirect)
                     |  /dashboard              |  (auth-gated, SSR + client)
                     |                          |
  FAN AUTH (new)     |  /fan/profile            |  (auth-gated, SSR + client)
                     |  /fan/settings           |  (auth-gated, SSR + client)
                     |                          |
  API ROUTES         |  /api/collect            |  (fan capture, admin client)
                     |  /api/qr/[slug]          |  (QR generation)
                     |  /api/claim              |  (performer claim, admin client)
                     |  /api/go-live            |  (event creation, admin client)
                     |  /api/messages           |  (message send, admin client)
                     +------------+-------------+
                                  |
                     +------------v-------------+
                     |       Supabase           |
                     |                          |
                     |  PostgreSQL (RLS on)     |
                     |  Auth (magic link OTP)   |
                     |  Storage (future)        |
                     |  Realtime (future)       |
                     +---------------------------+
```

## Component Boundaries

| Component | Responsibility | Communicates With | Auth Context |
|-----------|---------------|-------------------|--------------|
| **Middleware** (`src/middleware.ts`) | Auth guard for protected routes; refreshes Supabase session cookies | Supabase Auth, Next.js router | Reads session from cookies |
| **Public Pages** (`/`, `/artist/[slug]`) | Read-only performer/event display | Supabase via server client (anon key) | None required |
| **Collect Page** (`/collect/[slug]`) | Fan capture flow: email input, collection creation | `/api/collect` via fetch | None (fan identified by email) |
| **Auth Pages** (`/auth/login`, `/auth/callback`) | Performer login via magic link + code exchange | Supabase Auth directly | Creates session |
| **Dashboard** (`/dashboard`) | Performer analytics, fan management, messaging | Supabase via server client (anon key with RLS), API routes for writes | Performer session required |
| **Fan Profile** (new: `/fan/profile`) | Fan's collected artists, tier badges, scan history | Supabase via server client | Fan session required |
| **API Routes** (`/api/*`) | Writes that bypass RLS (admin operations) | Supabase via admin client (service role key) | Validated server-side |
| **Scraper Scripts** (`scripts/scrapers/`) | Offline data pipeline, not part of web app | Supabase via admin client | Service role key |

## Recommended Architecture for New Features

### 1. Dual Auth Model: Performers vs Fans

The biggest architectural decision: performers and fans are different user types in the same Supabase Auth system.

**Use Supabase Auth for BOTH, but differentiate by user_metadata.**

```
Auth flow:
  Performer: /auth/login → magic link → /auth/callback → check performers.claimed_by → /dashboard
  Fan:       /collect/[slug] → email → /api/collect (creates fan record, NO auth session)
             /fan/login → magic link → /auth/callback → check fans table by email → /fan/profile

Same Supabase Auth, different post-login routing.
```

**Implementation pattern:**

```typescript
// src/middleware.ts — extended matcher
export const config = {
  matcher: ["/dashboard/:path*", "/fan/:path*"],
};

// In middleware:
if (req.nextUrl.pathname.startsWith("/dashboard") && !user) {
  return NextResponse.redirect(new URL("/auth/login", req.url));
}
if (req.nextUrl.pathname.startsWith("/fan/") && !user) {
  return NextResponse.redirect(new URL("/fan/login", req.url));
}
```

**Why not separate auth systems:** Supabase Auth already handles magic links, session management, cookie refresh. Adding a second auth system is unnecessary complexity. The fan email already exists in the `fans` table from `/api/collect` -- when a fan logs in, just match `auth.users.email` to `fans.email`.

**Why not a single login page:** Performers and fans have completely different mental models. Performer login says "Performer Dashboard." Fan login says "Your Music Passport." Separate pages, same underlying auth.

### 2. Data Flow Patterns

#### Fan Capture Flow (existing, needs completion)

```
Fan at venue → scans QR code
    ↓
/collect/[slug] loads (SSR: fetch performer by slug)
    ↓
Fan enters email → POST /api/collect
    ↓
API route (admin client, bypasses RLS):
  1. UPSERT fan by email → get fan.id
  2. INSERT collection (fan_id, performer_id, today)
     └── unique constraint catches same-day duplicates
  3. COUNT collections for this fan+performer pair
  4. UPSERT fan_tier (scan_count, calculated tier)
  5. Return { scan_count, current_tier, already_collected }
    ↓
Client shows confirmation with tier badge + next-tier progress
```

**This flow is already built and correct.** The only additions needed:
- After collection, offer "Create your profile to track all your collections" CTA linking to `/fan/login`
- Store a cookie with fan email so repeat visits pre-fill the form

#### Performer Dashboard Flow (existing, needs polish)

```
Performer → /auth/login → magic link → /auth/callback
    ↓
Middleware checks auth → passes
    ↓
/dashboard SSR (server component):
  1. getUser() → get auth user
  2. Query performers WHERE claimed_by = user.id
     └── No match? → show ClaimPrompt (existing)
  3. Query fan_tiers, collections, scan history for this performer
  4. Pass all data to DashboardClient (client component)
    ↓
DashboardClient renders:
  - Stats cards (total fans, tier breakdown)
  - Scan history chart (90 days)
  - Fan list (searchable, filterable)
  - Message composer
  - QR download button
  - Go Live button
```

**What needs building:**
- The `DashboardClient` component needs to be fleshed out (currently exists but needs fan list, chart, message composer UI)
- QR download: call `/api/qr/[slug]` with `?format=png&dpi=300` param
- Go Live: existing API works, needs venue selector UI
- Message composer: existing API works, needs form UI with tier selector + preview

#### Fan Profile Flow (new)

```
Fan → /fan/login → magic link → /auth/callback
    ↓
Callback checks: does auth.users.email match a fans.email?
  YES → redirect /fan/profile
  NO  → redirect /fan/profile (create fan record on first visit)
    ↓
/fan/profile SSR:
  1. getUser() → get auth user
  2. Query fans WHERE email = user.email → get fan.id
     └── No match? → INSERT into fans, return new record
  3. Query collections JOIN performers for this fan
  4. Query fan_tiers for all performer relationships
  5. Pass to FanProfileClient
    ↓
FanProfileClient renders:
  - "Your Collections" grid (performer cards with tier badges)
  - Total stats (artists collected, shows attended, highest tier)
  - Scan history timeline
  - Link to /fan/settings
```

### 3. Server vs Client Component Split

Follow the existing pattern strictly: **SSR for data fetching, client components for interactivity.**

```
Pattern: Page (server) → fetches all data → passes props to Client wrapper

Example already in codebase:
  /dashboard/page.tsx (server) → DashboardClient (client)
  /collect/[slug]/page.tsx (server) → CollectForm (client)
```

**New components should follow this exactly:**

| Route | Server Component | Client Component(s) |
|-------|-----------------|---------------------|
| `/dashboard` | `page.tsx` — auth check, data fetch | `DashboardClient` — tabs, charts, forms |
| `/fan/profile` | `page.tsx` — auth check, fan data fetch | `FanProfileClient` — collection grid, stats |
| `/fan/settings` | `page.tsx` — auth check, fan data | `FanSettingsClient` — email/name form |
| `/collect/[slug]` | `page.tsx` — performer fetch | `CollectForm` — email input, submit |

**Do NOT fetch data in client components.** All Supabase reads happen in server components. Client components call API routes for mutations only.

### 4. API Route Architecture

The existing API routes use the admin client (service role key) for all writes. This bypasses RLS and is the correct pattern for this app because:

1. Fan capture has no auth session (fan just enters email)
2. Performer dashboard writes need cross-table operations
3. RLS policies would need complex setup for two user types

**Keep this pattern.** API routes = admin client for writes. Server components = anon client with RLS for reads.

```
Existing API routes:
  POST /api/collect      — fan capture (no auth needed)
  POST /api/claim        — performer claims profile (needs auth)
  POST /api/go-live      — performer goes live (needs auth)
  POST /api/messages     — performer sends message (needs auth)
  GET  /api/qr/[slug]    — QR code generation (public)

New API routes needed:
  POST /api/fan/update   — fan updates profile (needs fan auth)
  POST /api/fan/logout   — clears session (needs auth)
  POST /api/logout       — shared logout for both user types
```

**Auth validation for API routes:** The existing `/api/claim` route accepts `user_id` from the form, which is insecure. Protected API routes should validate the session server-side:

```typescript
// Pattern for authenticated API routes:
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Now use admin client for writes with verified user.id
  const admin = createSupabaseAdmin();
  // ...
}
```

### 5. Supabase Client Usage Rules

| Client | Created By | When to Use | Example |
|--------|-----------|-------------|---------|
| `createSupabaseServer()` | `supabase-server.ts` | Server components reading data with RLS | Dashboard page fetching performer stats |
| `createSupabaseBrowser()` | `supabase-browser.ts` | Client components needing auth state | Login form calling `signInWithOtp` |
| `createSupabaseAdmin()` | `supabase-admin.ts` | API routes writing data (bypasses RLS) | `/api/collect` inserting collections |

**Never use admin client in server components.** Server components use the server client which respects RLS. Only API routes use admin.

**Never use server client in client components.** It uses `next/headers` which is server-only. Client components use browser client for auth operations, and `fetch()` to API routes for data mutations.

## Patterns to Follow

### Pattern 1: Auth-Gated Page with Data Prefetch

This is the core pattern for dashboard and fan profile.

```typescript
// src/app/dashboard/page.tsx (server component)
import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch ALL data the client component needs
  const { data: performer } = await supabase
    .from("performers")
    .select("*")
    .eq("claimed_by", user.id)
    .single();

  // ...more queries...

  return <DashboardClient performer={performer} stats={stats} />;
}
```

### Pattern 2: Client Component with API Mutation

```typescript
// Client component pattern for writes
"use client";

async function handleSubmit() {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ performer_id, subject, body, target_tier }),
  });
  // Handle response...
}
```

### Pattern 3: Shared Auth Callback with Role Detection

```typescript
// src/app/auth/callback/route.ts — enhanced
export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/", req.url));

  const supabase = await createSupabaseServer();
  await supabase.auth.exchangeCodeForSession(code);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/", req.url));

  // Check if this user is a performer
  const { data: performer } = await supabase
    .from("performers")
    .select("id")
    .eq("claimed_by", user.id)
    .single();

  if (performer) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Check if redirect came from fan login
  const redirectTo = req.nextUrl.searchParams.get("next") || "/fan/profile";
  return NextResponse.redirect(new URL(redirectTo, req.url));
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fetching Data in Client Components via Supabase Directly
**What:** Using `createSupabaseBrowser()` to query tables in client components.
**Why bad:** Bypasses server-side data fetching, exposes query logic to client, duplicates RLS concerns. Also means data isn't available on first render (flash of loading state).
**Instead:** Fetch in server component, pass as props. Client components only use browser client for auth operations (`signInWithOtp`, `signOut`, `getUser` for client-side checks).

### Anti-Pattern 2: Trusting Client-Submitted User IDs
**What:** The current `/api/claim` route accepts `user_id` from form data. Any client can submit any user ID.
**Why bad:** A fan could claim a performer profile by submitting someone else's user ID.
**Instead:** Always verify auth session server-side in protected API routes. Get `user.id` from `supabase.auth.getUser()`, never from request body.

### Anti-Pattern 3: Separate Supabase Projects for Fans vs Performers
**What:** Creating a second Supabase project to handle fan auth separately.
**Why bad:** Double the infrastructure, cross-database queries impossible, sync nightmares.
**Instead:** One Supabase project, one auth system. Differentiate user roles by checking which table references their auth user ID (`performers.claimed_by` vs `fans` matched by email).

### Anti-Pattern 4: Client-Side Tier Calculation
**What:** Calculating tier on the client and sending it to the API.
**Why bad:** Fans could manipulate their tier by changing the request body.
**Instead:** Tier calculation stays in the API route (`/api/collect`). Client receives the calculated result. Already done correctly.

## Build Order (Based on Dependencies)

The dependency graph determines what must be built first:

```
1. Auth hardening (fix /api/claim security)
   └── No dependencies, foundational security fix

2. Fan capture page completion (/collect/[slug])
   └── Depends on: existing /api/collect (done)
   └── Adds: post-collection CTA, email cookie, OG tags

3. Performer dashboard UI (/dashboard)
   └── Depends on: auth (done), claim flow (done)
   └── Adds: stats cards, fan list, chart, message composer, QR download, Go Live UI

4. Fan auth flow (/fan/login, callback routing)
   └── Depends on: existing auth infrastructure (done)
   └── Adds: fan-specific login page, callback role detection

5. Fan profile page (/fan/profile, /fan/settings)
   └── Depends on: fan auth flow (#4), collections data (from #2)
   └── Adds: collection grid, tier badges, settings form

6. Logout flows (both user types)
   └── Depends on: both auth flows (#1, #4)
```

**Critical path:** 1 → 2 → 3 (performer side can ship independently). Then 4 → 5 → 6 (fan side).

Performer dashboard and fan profile are independent tracks that can be built in parallel once auth hardening is done, but the performer side should come first because it is the revenue side and needs to be demo-ready.

## Scalability Considerations

| Concern | Now (demo) | At 1K fans | At 100K fans |
|---------|-----------|------------|--------------|
| **SSR data fetch** | Query all fans in dashboard page.tsx | Paginate fan list, limit recent scans | Add API route for paginated fan list, use cursor pagination |
| **Tier calculation** | Count collections per request | Fine, indexed query | Pre-compute in fan_tiers table (already designed this way) |
| **QR code generation** | Generate on demand | Cache in Supabase Storage | Pre-generate and serve from CDN |
| **Message sending** | Stub (no delivery) | SendGrid with batch API | Queue with Supabase Edge Function + background processing |
| **Scan history chart** | Query raw collections | Aggregate by day in SQL | Materialized view or pre-aggregated daily_stats table |
| **Homepage performer grid** | Load 500 performers client-side filter | Server-side search with text index | Full-text search with `tsvector` or external search (Algolia) |

## File Structure (Recommended for New Features)

```
src/
  app/
    (public)/              # Route group: no auth
      page.tsx             # Homepage
      artist/[slug]/
      collect/[slug]/
    (performer)/           # Route group: performer auth
      dashboard/
        page.tsx           # Server: auth + data fetch
        dashboard-client.tsx
      auth/
        login/
        callback/
    (fan)/                 # Route group: fan auth
      fan/
        login/
        profile/
          page.tsx         # Server: auth + data fetch
          profile-client.tsx
        settings/
          page.tsx
          settings-client.tsx
    api/
      collect/route.ts
      claim/route.ts
      go-live/route.ts
      messages/route.ts
      qr/[slug]/route.ts
      fan/
        update/route.ts
      logout/route.ts      # Shared logout
  components/
    performer-grid.tsx     # Homepage grid (existing)
    tier-badge.tsx         # Shared tier badge component
    stat-card.tsx          # Dashboard stat card
    scan-chart.tsx         # 90-day scan chart
    fan-list.tsx           # Searchable fan table
    message-composer.tsx   # Message form with tier selector
    qr-download.tsx        # QR code preview + download
    go-live-button.tsx     # Venue selector + go live
    collection-card.tsx    # Fan profile collection card
  lib/
    supabase.ts            # Re-exports (existing)
    supabase-server.ts     # Server client (existing)
    supabase-browser.ts    # Browser client (existing)
    supabase-admin.ts      # Admin client (existing)
    tiers.ts               # Tier config, calculation, colors (extract from collect-form)
    types.ts               # Shared TypeScript types
  middleware.ts            # Extended matcher for /dashboard + /fan
```

**Note on route groups:** The `(public)`, `(performer)`, `(fan)` route groups are optional organizational sugar. They do not affect URL paths but help developers understand auth boundaries. Whether to use them depends on how many routes are added -- for the current scope it is probably fine to keep the flat structure.

## Sources

- Existing codebase analysis (HIGH confidence -- direct code inspection)
- Supabase SSR docs: `@supabase/ssr` cookie-based auth pattern (HIGH confidence -- already implemented correctly in codebase)
- Next.js 15 App Router: server component + client component split pattern (HIGH confidence -- already implemented)
- Supabase Auth magic link flow (HIGH confidence -- already working in `/auth/login`)
