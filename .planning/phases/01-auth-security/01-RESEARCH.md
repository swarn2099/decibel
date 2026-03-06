# Phase 1: Auth & Security - Research

**Researched:** 2026-03-06
**Domain:** Supabase Auth + Next.js 16 middleware + RLS
**Confidence:** HIGH

## Summary

This phase is largely about hardening and completing what already exists rather than building from scratch. The magic link auth flow (login-form.tsx, callback/route.ts) works. The middleware exists and protects /dashboard routes. The critical work is: (1) fixing the /api/claim security hole where user_id comes from form data instead of the session, (2) switching dashboard queries to use the admin client after server-side auth verification (bypassing the missing RLS policies), (3) adding logout functionality, and (4) adding basic RLS policies for defense-in-depth even though the admin client bypasses them.

The existing code uses `@supabase/ssr@0.9.0` with `next@16.1.6` and `@supabase/supabase-js@2.98.0`. The middleware pattern already follows the official Supabase SSR guide correctly -- creating a server client with cookie handlers, calling `getUser()`, and redirecting unauthenticated users. No library upgrades or architectural changes are needed.

**Primary recommendation:** Fix the claim route security hole, switch dashboard queries to admin client with auth guard, add logout, and add RLS policies as defense-in-depth. This is a security hardening phase, not a greenfield build.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Magic link via Supabase OTP -- already working in login-form.tsx
- Session persists via @supabase/ssr cookie-based server client -- already set up
- Auth callback at /auth/callback exchanges code for session and redirects to /dashboard
- No changes needed to the core auth flow -- it works. Focus is on security hardening.
- Use Next.js middleware to protect /dashboard routes -- redirect to /auth/login if no session
- Public routes that must NOT be protected: /, /artist/[slug], /collect/[slug], /auth/*
- CRITICAL FIX: /api/claim currently accepts user_id from form data -- anyone can claim any profile
- Fix: Extract user_id from the authenticated Supabase session server-side, ignore form-submitted user_id
- The claim prompt in dashboard/page.tsx passes user_id as hidden form field -- remove this
- Strategy: Use admin client (service role) for dashboard server queries instead of adding complex per-user RLS policies
- Rationale: Dashboard page.tsx already uses server-side data fetching with auth check -- admin client after auth verification is equivalent to RLS but simpler
- Add logout functionality -- Supabase signOut() + redirect to /auth/login
- Available from dashboard header/nav

### Claude's Discretion
- Middleware implementation details (matcher patterns, edge runtime)
- Error page design for unauthorized access
- Session refresh strategy

### Deferred Ideas (OUT OF SCOPE)
- Fan auth via magic link -- Phase 4
- Role-based routing in callback (performer vs fan) -- Phase 4
- Custom SMTP for magic link deliverability -- post-launch if needed
- Granular RLS policies per user -- not needed while using admin client with server-side auth check
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Performer can sign in via Supabase magic link (email) | Already working -- login-form.tsx uses signInWithOtp, callback/route.ts exchanges code for session. No changes needed. |
| AUTH-02 | Performer session persists across browser refresh | Already working -- @supabase/ssr cookie-based server client handles this. Middleware refreshes session on each request via getUser(). |
| AUTH-03 | Performer can log out from dashboard | New work -- add signOut() call from browser client + redirect to /auth/login. Needs a logout button in dashboard UI. |
| AUTH-04 | Dashboard routes are protected -- unauthenticated users redirect to login | Partially done -- middleware.ts exists with correct pattern. Matcher already set to /dashboard/:path*. Verify it works end-to-end. |
| AUTH-05 | Performer claim flow verifies session identity (fix /api/claim security hole) | Critical fix -- /api/claim line 8 takes user_id from formData. Must extract from Supabase session server-side instead. Remove hidden field from ClaimPrompt. |
| AUTH-06 | RLS policies added for collections, fan_tiers, and messages tables | New work -- add basic RLS policies for defense-in-depth. Dashboard queries will use admin client (bypasses RLS) but policies protect against direct API access with anon key. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| @supabase/ssr | 0.9.0 | Cookie-based server/browser clients | Working, no changes |
| @supabase/supabase-js | 2.98.0 | Supabase client, auth methods | Working, no changes |
| next | 16.1.6 | Framework, middleware, app router | Working, no changes |
| server-only | 0.0.1 | Prevents server code in client bundles | Already used in supabase-server.ts |

### No New Dependencies Needed
This phase requires zero new npm packages. Everything needed is already installed.

## Architecture Patterns

### Existing File Structure (No Changes Needed)
```
src/
├── lib/
│   ├── supabase.ts          # Re-exports all three clients
│   ├── supabase-server.ts   # Cookie-based server client (anon key, respects RLS)
│   ├── supabase-browser.ts  # Browser client (anon key)
│   └── supabase-admin.ts    # Service role client (bypasses RLS)
├── middleware.ts             # Route protection (already exists)
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   ├── page.tsx      # Login page shell
│   │   │   └── login-form.tsx # Magic link form (working)
│   │   └── callback/
│   │       └── route.ts      # Code-to-session exchange (working)
│   ├── dashboard/
│   │   ├── page.tsx          # Server component with auth check + data fetching
│   │   └── dashboard-client.tsx # Client component for interactivity
│   └── api/
│       └── claim/
│           └── route.ts      # Profile claim endpoint (NEEDS FIX)
```

### Pattern 1: Server-Side Auth Guard + Admin Client
**What:** Verify user identity via `getUser()` in server components, then use admin client for data queries.
**When to use:** All dashboard data fetching.
**Why:** Sidesteps missing RLS policies while maintaining security -- auth check happens server-side before any data access.
**Example:**
```typescript
// In a server component (e.g., dashboard/page.tsx)
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // Step 1: Verify auth via server client (uses cookies)
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Step 2: Query data via admin client (bypasses RLS)
  const admin = createSupabaseAdmin();
  const { data: performer } = await admin
    .from("performers")
    .select("*")
    .eq("claimed_by", user.id) // Scoped by authenticated user's ID
    .single();
  // ...
}
```

### Pattern 2: Secure API Route with Session Extraction
**What:** Extract user identity from the Supabase session inside API routes instead of trusting form data.
**When to use:** Any API route that performs writes on behalf of a user (e.g., /api/claim).
**Example:**
```typescript
// In an API route (e.g., api/claim/route.ts)
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  // Step 1: Get authenticated user from session
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 2: Use user.id from session, NOT from form data
  const formData = await req.formData();
  const performerId = formData.get("performer_id") as string;
  // userId comes from session, not form: user.id

  // Step 3: Perform write with admin client
  const admin = createSupabaseAdmin();
  await admin
    .from("performers")
    .update({ claimed: true, claimed_by: user.id })
    .eq("id", performerId);
}
```

### Pattern 3: Client-Side Logout
**What:** Call signOut() from browser client, then redirect.
**Example:**
```typescript
"use client";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return <button onClick={handleLogout}>Log Out</button>;
}
```

### Anti-Patterns to Avoid
- **Trusting form-submitted user IDs:** The current /api/claim vulnerability. Always extract identity from the server-side session.
- **Using getSession() for auth checks:** The Supabase docs explicitly warn against this. Always use getUser() which validates the token with the auth server.
- **Querying with anon client when RLS policies are missing:** The dashboard queries currently use the server client (anon key + RLS). Since RLS policies for collections/fan_tiers don't exist yet, these queries return empty. Switch to admin client after auth verification.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom JWT/cookie handling | @supabase/ssr createServerClient | Handles token refresh, cookie chunking, PKCE flow |
| Route protection | Custom auth HOCs or wrappers | Next.js middleware + Supabase getUser() | Runs at edge before page renders, single place for auth logic |
| Logout | Custom token invalidation | supabase.auth.signOut() | Handles token revocation, cookie cleanup |

## Common Pitfalls

### Pitfall 1: Import Path Inconsistency
**What goes wrong:** The callback/route.ts and dashboard/page.tsx import from `@/lib/supabase` (the re-export barrel). The actual implementations are in `supabase-server.ts`, `supabase-browser.ts`, `supabase-admin.ts`. Both import paths work.
**How to avoid:** Be consistent -- use either the barrel import or the direct file import, not a mix. The barrel pattern is already established so continue using it.

### Pitfall 2: Middleware Not Refreshing Session
**What goes wrong:** If middleware doesn't call `getUser()`, expired tokens aren't refreshed, and server components see stale/invalid sessions.
**How to avoid:** The existing middleware already calls getUser() which triggers token refresh. This is correct. Don't remove it.

### Pitfall 3: Admin Client Exposed to Browser
**What goes wrong:** The service role key bypasses all RLS. If it leaks to the client bundle, anyone can read/write anything.
**How to avoid:** `supabase-admin.ts` already imports `server-only` which prevents it from being bundled into client components. Never import it in "use client" files.
**Warning signs:** Build error saying "server-only" module used in client component -- this is the guard working correctly.

### Pitfall 4: Claim Route Redirect After POST
**What goes wrong:** The current /api/claim uses `NextResponse.redirect()` after a POST form submission. This works but can cause issues with browser back button.
**How to avoid:** Keep the redirect pattern for now (it's simple and functional for v1). Could switch to a server action in the future but that's over-engineering for this phase.

### Pitfall 5: RLS Policies Block Admin Operations
**What goes wrong:** Adding overly restrictive RLS policies can block the admin client if `force_row_level_security` is enabled on the table.
**How to avoid:** Standard Supabase behavior: service role key bypasses RLS unless the table has `force_row_level_security` enabled. Don't enable that flag. The admin client will work fine.

## Code Examples

### Fixing /api/claim (AUTH-05)
```typescript
// BEFORE (insecure): user_id from form data
const userId = formData.get("user_id") as string;

// AFTER (secure): user_id from authenticated session
const supabase = await createSupabaseServer();
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const userId = user.id; // From session, not form
```

### Basic RLS Policy for collections (AUTH-06)
```sql
-- Allow authenticated users to read their own collections (as performers)
CREATE POLICY "Performers can read own collections"
  ON collections FOR SELECT
  USING (
    performer_id IN (
      SELECT id FROM performers WHERE claimed_by = auth.uid()
    )
  );

-- Allow authenticated users to insert collections (for fan capture in Phase 2)
CREATE POLICY "Allow collection inserts"
  ON collections FOR INSERT
  WITH CHECK (true);
  -- Note: Phase 2 will tighten this when fan capture is built
```

### Middleware Matcher Pattern (Claude's Discretion)
```typescript
export const config = {
  matcher: [
    "/dashboard/:path*",
    // Exclude static files and API routes that handle their own auth
    // Don't add /api/claim here -- it checks auth internally
  ],
};
```
**Recommendation:** Keep the matcher simple -- only /dashboard/:path* needs middleware protection. API routes should check auth internally so they can return proper JSON error responses instead of redirects.

### Session Refresh Strategy (Claude's Discretion)
**Recommendation:** The current approach is correct and sufficient for v1. The middleware calls `getUser()` on every /dashboard request, which refreshes the token if expired. No additional refresh logic needed. `getClaims()` is a newer, faster alternative but `getUser()` is more thorough (validates against the auth server) and the performance difference is negligible at v1 scale.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers | @supabase/ssr | 2024 | Already using current approach |
| getSession() for auth | getUser() for auth | 2024 | Already using getUser() correctly |
| getUser() in middleware | getClaims() option | Late 2025 | Not needed for v1 -- getUser() is fine |

## Open Questions

1. **RLS policy scope for AUTH-06**
   - What we know: User decided to use admin client for dashboard queries (bypasses RLS). RLS policies are defense-in-depth.
   - What's unclear: How restrictive should the RLS policies be? The requirement says "added for collections, fan_tiers, and messages" but the decision says "granular RLS per user" is deferred.
   - Recommendation: Add simple policies that restrict SELECT to authenticated users whose performer record matches. Keep INSERT/UPDATE permissive since writes go through API routes with their own auth checks. This satisfies AUTH-06 without over-engineering.

2. **Error page for unauthorized access (Claude's Discretion)**
   - Recommendation: No custom error page needed. Middleware redirects to /auth/login which is sufficient. A flash message ("Please sign in to access the dashboard") would be nice but is polish, not security.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test infrastructure exists |
| Config file | none -- see Wave 0 |
| Quick run command | `npm run build` (type-check + build) |
| Full suite command | `npm run build` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Magic link sign-in | manual-only | N/A -- requires email delivery + click | N/A |
| AUTH-02 | Session persists across refresh | manual-only | N/A -- requires browser session | N/A |
| AUTH-03 | Logout from dashboard | manual-only | N/A -- requires browser session | N/A |
| AUTH-04 | Dashboard redirect for unauthed | manual-only | N/A -- requires middleware + browser | N/A |
| AUTH-05 | Claim flow uses session identity | manual-only | N/A -- requires authenticated session | N/A |
| AUTH-06 | RLS policies exist | smoke | `npx supabase db diff` or manual SQL check | N/A |

**Justification for manual-only:** All auth requirements involve browser sessions, cookie handling, and email delivery. These are inherently integration/e2e tests that would require Playwright + a test Supabase instance. Setting up e2e auth testing infrastructure is out of scope for a v1 demo. The build check (`npm run build`) catches type errors and import issues.

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build`
- **Phase gate:** Build passes + manual verification of all 5 success criteria from the phase description

### Wave 0 Gaps
None -- auth testing requires e2e infrastructure that is disproportionate to v1 demo scope. Build check is the automated gate; manual verification covers auth flows.

## Sources

### Primary (HIGH confidence)
- Existing codebase: middleware.ts, supabase-server.ts, supabase-admin.ts, login-form.tsx, callback/route.ts, dashboard/page.tsx, api/claim/route.ts -- all read and analyzed
- [Supabase SSR Next.js docs](https://supabase.com/docs/guides/auth/server-side/nextjs) -- verified middleware pattern matches existing code
- [Supabase auth getClaims reference](https://supabase.com/docs/reference/javascript/auth-getclaims) -- confirmed getUser() is still valid, getClaims() is optional optimization

### Secondary (MEDIUM confidence)
- [Supabase GitHub issue #40985](https://github.com/supabase/supabase/issues/40985) -- getClaims vs getUser clarification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and working, versions verified from node_modules
- Architecture: HIGH -- existing code patterns are clear, changes are surgical not architectural
- Pitfalls: HIGH -- based on direct code analysis of existing implementation

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable -- no library changes needed)
