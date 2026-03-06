# Phase 4: Fan Profile + Polish - Research

**Researched:** 2026-03-06
**Domain:** Next.js 16 auth routing, Supabase fan data queries, profile UI
**Confidence:** HIGH

## Summary

This phase adds fan-facing authenticated pages (profile, settings) and a final polish pass. All patterns are already established in the codebase from Phases 1-3 -- the dashboard server/client component split, admin client queries, middleware route protection, magic link auth, and the Decibel design system. No new libraries are needed.

The main technical work is: (1) making the login page and auth callback role-aware (fan vs performer redirect), (2) building /profile and /settings pages using the same server-fetches-client-renders pattern as the dashboard, (3) extracting shared tier constants to a lib file, and (4) an aesthetic consistency sweep.

**Primary recommendation:** Follow existing patterns exactly. Extract TIER_COLORS/TIER_LABELS to `src/lib/tiers.ts`, build /profile and /settings as server+client component pairs using admin client queries, extend middleware matcher to protect both routes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Fan auth reuses existing magic link login form (login-form.tsx) -- update page copy from "Performer Dashboard" to "Sign In"
- Auth callback smart redirect: check if user has claimed performer -> /dashboard, otherwise -> /profile
- Add /profile and /settings to middleware matcher
- Fans don't need performers table -- identity from auth.users, data from fans table (email match)
- /profile: server component fetches, passes to client component (same as dashboard)
- Collection grid: card layout with performer photo, name, tier badge, scan count; cards link to /artist/[slug]
- Scan history: chronological list below collection grid
- Empty state: "You haven't collected any performers yet. Scan a QR code at your next show to get started."
- Use admin client for queries (same as dashboard)
- /settings: simple form page with display name update + logout
- New API route: /api/settings (POST) -- updates fan name by authenticated user email
- Aesthetic pass: bg-bg, bg-bg-card, brand accents, consistent tier colors
- npm run build must pass with zero errors

### Claude's Discretion
- Exact card grid layout (2-col mobile, 3-col desktop, etc.)
- Profile header design (simple vs hero-style)
- Whether to extract TIER_COLORS/TIER_LABELS to shared file or duplicate
- Settings page layout details
- Any minor polish decisions for demo readiness

### Deferred Ideas (OUT OF SCOPE)
- Fan email notifications when collected performer goes live -- v2
- Fan collection sharing (public profile URL) -- v2
- Fan achievement badges beyond tiers -- v2
- Dark/light mode toggle in settings -- v2
- Account deletion in settings -- v2
- Profile photo upload -- v2
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-07 | Fan can log in via magic link to view their profile | Reuse login-form.tsx, update login page copy, update auth/callback redirect logic |
| FAN-01 | Logged-in fan can view collected artists in grid/list | Server component queries collections+fan_tiers+performers via admin client, passes to client grid |
| FAN-02 | Each collected artist shows tier badge and scan count | Shared TIER_COLORS/TIER_LABELS from extracted lib, badge component on cards |
| FAN-03 | Fan can view scan history with dates | Query collections with performer+venue joins, render chronological list |
| FAN-04 | Fan profile page follows dark underground aesthetic | Use established design tokens (bg-bg, bg-bg-card, brand colors, Poppins) |
| SETT-01 | Fan can access settings from profile | Link in profile header to /settings |
| SETT-02 | Fan can update display name | /api/settings POST endpoint, admin client update fans.name by email |
| SETT-03 | Both fans and performers can log out | Fan: settings page + profile header logout; Performer: existing dashboard logout |
| SETT-04 | Settings page follows dark underground aesthetic | Same design tokens as all other pages |
| DEMO-01 | All pages follow Decibel dark aesthetic | Audit sweep of all pages for consistent tokens |
| DEMO-02 | Tier colors consistent everywhere | Extract to shared lib, use in profile + collect + dashboard |
| DEMO-05 | npm run build passes with zero errors | Final build check after all changes |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| next | 16.1.6 | App router, server components | Installed |
| @supabase/ssr | ^0.9.0 | Server/browser Supabase clients | Installed |
| @supabase/supabase-js | ^2.98.0 | Admin client, DB queries | Installed |
| lucide-react | ^0.577.0 | Icons | Installed |
| motion | ^12.35.0 | Animations | Installed |
| sonner | ^2.0.7 | Toast notifications | Installed |
| tailwindcss | v4 | Styling with custom design tokens | Installed |

### No New Dependencies Needed
This phase uses exclusively existing libraries. No additions required.

## Architecture Patterns

### Recommended File Structure for Phase 4
```
src/
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   ├── page.tsx           # UPDATE: change "Performer Dashboard" to "Sign In"
│   │   │   └── login-form.tsx     # No changes needed
│   │   └── callback/
│   │       └── route.ts           # UPDATE: smart redirect (performer -> /dashboard, fan -> /profile)
│   ├── profile/
│   │   ├── page.tsx               # NEW: server component (auth check + data fetch)
│   │   └── profile-client.tsx     # NEW: client component (collection grid + scan history)
│   ├── settings/
│   │   ├── page.tsx               # NEW: server component (auth check + fan data fetch)
│   │   └── settings-client.tsx    # NEW: client component (form + logout)
│   └── api/
│       └── settings/
│           └── route.ts           # NEW: POST handler for display name update
├── lib/
│   └── tiers.ts                   # NEW: shared TIER_COLORS, TIER_LABELS, TIER_THRESHOLDS
└── middleware.ts                   # UPDATE: add /profile, /settings to matcher
```

### Pattern 1: Server + Client Component Split (Established)
**What:** Server component handles auth check + data fetching with admin client, passes props to client component for interactivity.
**When to use:** Every protected page.
**Example (from existing dashboard/page.tsx):**
```typescript
// Server component (page.tsx)
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createSupabaseAdmin();
  // Fetch data with admin client...

  return <ProfileClient data={data} />;
}
```

### Pattern 2: Auth Callback Smart Redirect
**What:** After magic link auth, redirect based on user role.
**Implementation:**
```typescript
// auth/callback/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const admin = createSupabaseAdmin();
      const { data: performer } = await admin
        .from("performers")
        .select("id")
        .eq("claimed_by", user.id)
        .single();

      if (performer) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return NextResponse.redirect(new URL("/profile", req.url));
}
```

### Pattern 3: API Route with Session Auth (Established)
**What:** API routes authenticate via server-side session, never trust client-submitted identity.
**Example (from existing /api/claim):**
```typescript
export async function POST(req: NextRequest) {
  const supabaseAuth = await createSupabaseServer();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use user.email to find fan record, update with admin client
  const admin = createSupabaseAdmin();
  await admin.from("fans").update({ name: newName }).eq("email", user.email);
}
```

### Pattern 4: Middleware Route Protection (Established)
**What:** Middleware checks auth for protected routes, redirects to login if unauthenticated.
**Update needed:**
```typescript
export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/settings/:path*"],
};
```

### Anti-Patterns to Avoid
- **Don't create a separate fan login page:** Reuse the existing login form. Fans and performers both sign in with magic link; the redirect logic determines where they go.
- **Don't use RLS for fan queries:** RLS policies aren't properly set up for fan reads. Continue using admin client (same decision as Phase 1).
- **Don't fetch in client components:** All Supabase queries happen in server components with admin client.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tier color/label mapping | Inline constants in each file | Shared `src/lib/tiers.ts` | Already duplicated in dashboard-client.tsx and collect-form.tsx |
| Auth state management | Custom auth context | `supabase.auth.getUser()` server-side | Already working pattern in middleware + pages |
| Toast notifications | Custom notification system | `sonner` (already in root layout) | Already configured globally |
| Route protection | Per-page auth checks alone | Middleware + page-level redirect | Defense in depth (middleware catches + page verifies) |

## Common Pitfalls

### Pitfall 1: Fan Not Found in Fans Table
**What goes wrong:** A fan logs in via magic link but has never scanned a QR code, so they have no row in the `fans` table.
**Why it happens:** Magic link creates an auth.users entry, but fans table rows are only created during the collect flow (QR scan).
**How to avoid:** Profile page must handle the case where `fans` table has no row for the authenticated user's email. Show the empty state message. Don't error out.
**Warning signs:** "null" errors when querying fans table by email.

### Pitfall 2: Auth Callback Redirect Loop
**What goes wrong:** Fan clicks magic link, callback tries to check performer table, something fails, redirects to login, which redirects back.
**Why it happens:** Error in the callback route or middleware misconfiguration.
**How to avoid:** Default redirect should be /profile (safe fallback). Only redirect to /dashboard if performer lookup explicitly succeeds. Catch errors and default to /profile.

### Pitfall 3: Middleware vs Page Auth Check Mismatch
**What goes wrong:** Middleware uses `createServerClient` while pages use `createSupabaseServer`. Cookie handling must be consistent.
**Why it happens:** Different Supabase client creation methods handle cookies differently.
**How to avoid:** Don't change the middleware pattern -- it already works. Just extend the matcher array.

### Pitfall 4: Next.js 16 Dynamic Route Params
**What goes wrong:** Accessing params directly instead of awaiting them.
**Why it happens:** Next.js 15+ changed params to be async (Promise).
**How to avoid:** Already handled correctly in collect/[slug]/page.tsx: `const { slug } = await params;`

### Pitfall 5: Light Mode Inconsistency
**What goes wrong:** New pages look fine in dark mode but break in light mode.
**Why it happens:** globals.css has light mode overrides for --bg, --bg-card, --text, etc. Hardcoded colors won't adapt.
**How to avoid:** Always use design token classes (bg-bg, bg-bg-card, text-gray, etc.), never raw hex or hardcoded Tailwind colors. The existing codebase already follows this pattern.

## Code Examples

### Fan Profile Data Query
```typescript
// Server component: fetch fan's collected performers with tier info
const admin = createSupabaseAdmin();

// Find fan by email
const { data: fan } = await admin
  .from("fans")
  .select("id, email, name")
  .eq("email", user.email)
  .single();

if (!fan) {
  // Render empty state -- fan has auth but no collections
  return <ProfileClient fan={null} collections={[]} />;
}

// Get collections with performer details and tier info
const { data: collections } = await admin
  .from("fan_tiers")
  .select(`
    scan_count,
    current_tier,
    last_scan_date,
    performers!inner (id, name, slug, photo_url, genres, city)
  `)
  .eq("fan_id", fan.id)
  .order("last_scan_date", { ascending: false });

// Get scan history (individual collection events)
const { data: scanHistory } = await admin
  .from("collections")
  .select(`
    id,
    event_date,
    capture_method,
    created_at,
    performers!inner (name, slug),
    venues (name)
  `)
  .eq("fan_id", fan.id)
  .order("created_at", { ascending: false })
  .limit(50);
```

### Shared Tier Constants
```typescript
// src/lib/tiers.ts
export const TIER_COLORS: Record<string, { text: string; bg: string }> = {
  network: { text: "text-pink", bg: "bg-pink/10" },
  early_access: { text: "text-purple", bg: "bg-purple/10" },
  secret: { text: "text-blue", bg: "bg-blue/10" },
  inner_circle: { text: "text-teal", bg: "bg-teal/10" },
};

export const TIER_LABELS: Record<string, string> = {
  network: "Network",
  early_access: "Early Access",
  secret: "Secret",
  inner_circle: "Inner Circle",
};

export const TIER_THRESHOLDS = {
  network: 1,
  early_access: 3,
  secret: 5,
  inner_circle: 10,
};
```

### Settings API Route
```typescript
// src/app/api/settings/route.ts
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("fans")
    .update({ name: name.trim() })
    .eq("email", user.email);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `params` as sync object | `params` as Promise (await) | Next.js 15+ | Already handled in codebase |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Already using new package |
| Pages Router | App Router | Next.js 13+ | Already using App Router |

**Nothing deprecated or outdated** in the current stack for this phase's needs.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | none |
| Quick run command | `npm run build` (type-check + build) |
| Full suite command | `npm run build` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-07 | Fan login via magic link | manual-only | N/A -- requires email delivery | N/A |
| FAN-01 | View collected artists grid | manual-only | N/A -- requires auth session + DB data | N/A |
| FAN-02 | Tier badge + scan count on cards | manual-only | Visual verification | N/A |
| FAN-03 | Scan history with dates | manual-only | N/A -- requires auth session + DB data | N/A |
| FAN-04 | Dark aesthetic on profile | manual-only | Visual verification | N/A |
| SETT-01 | Settings link from profile | manual-only | Visual verification | N/A |
| SETT-02 | Update display name | manual-only | N/A -- requires auth session | N/A |
| SETT-03 | Logout works for both roles | manual-only | N/A -- requires auth session | N/A |
| SETT-04 | Dark aesthetic on settings | manual-only | Visual verification | N/A |
| DEMO-01 | All pages follow dark aesthetic | manual-only | Visual audit | N/A |
| DEMO-02 | Tier colors consistent | unit | grep for TIER_COLORS usage | N/A |
| DEMO-05 | Build passes | smoke | `npm run build` | N/A |

**Justification for manual-only:** No test framework configured. All requirements involve authenticated UI flows that need a real Supabase session. The primary automated validation is `npm run build` which catches type errors and build failures.

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build`
- **Phase gate:** `npm run build` passes with zero errors (DEMO-05)

### Wave 0 Gaps
None -- no test framework to set up. Build verification (`npm run build`) is the automated gate.

## Open Questions

1. **Fan table row creation for auth-only users**
   - What we know: fans table rows are created during QR scan (collect API). A fan who logs in via magic link but has never scanned won't have a fans row.
   - What's unclear: Should we create a fans row on first login, or only show empty state?
   - Recommendation: Show empty state. Don't auto-create fans rows on login -- keep fan creation tied to the collect flow. The profile page handles this gracefully.

2. **Settings update for fans without a fans row**
   - What we know: /api/settings updates fans.name by email. If no fans row exists, the update does nothing.
   - What's unclear: Should settings page be accessible to fans with no fans row?
   - Recommendation: Allow access but disable the name field with a note: "Complete your first collection to unlock settings." Or simply upsert (create if not exists) when updating the name.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/app/dashboard/page.tsx`, `dashboard-client.tsx` -- established server/client patterns
- Codebase analysis: `src/middleware.ts` -- route protection pattern
- Codebase analysis: `src/app/auth/callback/route.ts` -- auth flow
- Codebase analysis: `src/app/api/collect/route.ts` -- fans table schema (email, name, id)
- Codebase analysis: `src/app/api/claim/route.ts` -- session auth API pattern
- Codebase analysis: `src/app/globals.css` -- design tokens and theme system
- Codebase analysis: `package.json` -- Next.js 16.1.6, all dependencies confirmed

### Secondary (MEDIUM confidence)
- None needed -- all patterns are established in-codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and in use
- Architecture: HIGH - all patterns established in Phases 1-3, direct copy-paste adaptation
- Pitfalls: HIGH - identified from actual codebase analysis (fan table gaps, auth flow edge cases)

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable -- no external dependencies changing)
