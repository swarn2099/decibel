# Technology Stack

**Project:** Decibel — Fan Capture, Performer Dashboard, Fan Profiles
**Researched:** 2026-03-06

## Current Foundation (Already Installed)

These are locked in. The project runs on them today with 429 performers live in production.

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | App Router, SSR, API routes |
| React | 19.2.3 | UI framework |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Styling (with Decibel design tokens) |
| @supabase/supabase-js | ^2.98.0 | Database client, auth, realtime |
| @supabase/ssr | ^0.9.0 | Server-side auth with cookie management |
| lucide-react | ^0.577.0 | Icon set |
| qrcode | ^1.5.4 | QR code generation (already used in `/api/qr/[slug]`) |
| sharp | ^0.34.5 | Image processing |

**Note:** CLAUDE.md says "Next.js 15" but `package.json` shows 16.1.6. The project is already on Next.js 16 (latest stable). All recommendations below are verified against React 19.2 + Next.js 16.

## New Dependencies to Add

### Charting — Recharts 3.7.0
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| recharts | 3.7.0 | Dashboard analytics charts (scans over time, tier breakdown) | React-native SVG charts, composable API, good dark-theme support. Recharts 3.x supports React 19. Tremor is built on Recharts anyway — skip the abstraction layer and use Recharts directly for full control over the dark underground aesthetic. |

**Confidence:** HIGH — verified latest npm version, React 19 issue resolved in 3.x series.

**Installation note:** May need `--legacy-peer-deps` if `react-is` peer dep lags behind React 19. Check at install time.

### Animations — motion 12.35.0
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| motion | 12.35.0 | Capture page animations, tier reveal, dashboard transitions | The `motion` package is the React 19-compatible successor to framer-motion. Same API (`<motion.div>`), same team, but properly supports React 19 + Next.js App Router. Use `motion` not `framer-motion`. |

**Confidence:** HIGH — verified on npm, official migration path from framer-motion.

### Toast Notifications — Sonner 2.0.7
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| sonner | 2.0.7 | Success/error feedback on collect, dashboard actions, message sending | 2-3KB gzipped, no hooks/providers required, works from anywhere (Server Actions, client components). Adopted by shadcn/ui, Vercel, and Cursor. Sonner over react-hot-toast because: smaller bundle, simpler API (no `<Toaster>` wrapper gymnastics), and better React 19 support. |

**Confidence:** HIGH — verified latest npm version, widely adopted.

### Date Formatting — date-fns (latest)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| date-fns | ^4.1 | Format scan dates, event dates, "X days ago" relative time | Tree-shakable (import only what you use), no global mutation (unlike Moment/dayjs). Perfect for displaying "Last scan: 3 days ago" on dashboard and "Collected on Mar 6, 2026" on fan profiles. |

**Confidence:** HIGH — stable, well-known, no compatibility concerns.

## Stack Decisions: What NOT to Use

| Category | Rejected | Why Not |
|----------|----------|---------|
| Animation | framer-motion | Deprecated package name. Use `motion` instead — same library, React 19 compatible |
| Animation | react-spring | Heavier, spring-physics-only, less intuitive API for simple transitions |
| Charts | Chart.js / react-chartjs-2 | Canvas-based (harder to style with CSS/Tailwind for dark theme), imperative API |
| Charts | Tremor | Abstraction on top of Recharts — adds dependency weight, constrains styling. Decibel's dark aesthetic needs direct control |
| Charts | D3 | Overkill. Dashboard needs line charts and bar charts, not force-directed graphs |
| Toast | react-hot-toast | Slightly larger bundle, requires Provider wrapper, less modern API |
| Toast | react-toastify | 30KB+, kitchen-sink approach, unnecessary for this project |
| State mgmt | Redux / Zustand | Supabase handles server state. React 19 `use()` + Server Components handle the rest. No client state manager needed |
| Forms | react-hook-form | The collect page has ONE email field. The message composer has 3 fields. Plain controlled components are fine. Adding a form library is over-engineering |
| Email sending | Resend | Good product, but the PRD says stub email delivery for v1. Don't add an email service dependency yet. When ready, Resend + React Email is the right combo |
| UI library | shadcn/ui | Decibel has a very specific dark underground aesthetic. shadcn's default styling would fight the design system. Build components from scratch with Tailwind + design tokens |
| CSS-in-JS | styled-components / emotion | Tailwind 4 is already here and working. Don't mix paradigms |

## Auth Stack (Already Partially Built)

The auth stack is Supabase Auth with magic links — no additional libraries needed.

| Component | Approach | Status |
|-----------|----------|--------|
| Performer auth | Supabase `signInWithOtp()` magic link | Route exists at `/auth/login`, needs completion |
| Auth middleware | `@supabase/ssr` middleware refreshing cookies | Needs implementation in `middleware.ts` |
| Protected routes | Middleware redirects unauthenticated users from `/dashboard` | Needs implementation |
| Fan identification | Email field on `/collect/[slug]` — no auth, just email-based lookup | Needs implementation |
| Session management | Supabase handles via HTTP-only cookies | Built into `@supabase/ssr` |

**Key pattern:** Performers authenticate (magic link). Fans do NOT authenticate — they provide an email and that's their identifier. Two completely different auth models in one app.

## QR Code Generation (Already Built, Enhancement Needed)

The `qrcode` package is already installed and used at `/api/qr/[slug]`. For print-ready 300 DPI PNG:

- Use `qrcode.toBuffer()` with `width: 1200` (1200px at 300 DPI = 4-inch QR code)
- Use `sharp` (already installed) to set DPI metadata: `sharp(buffer).withMetadata({ density: 300 }).png().toBuffer()`
- No new dependencies needed

## Supabase Features to Leverage (No New Dependencies)

| Feature | Use Case | How |
|---------|----------|-----|
| Supabase Auth | Performer magic link login | `supabase.auth.signInWithOtp({ email })` |
| Supabase Realtime | Live fan count on dashboard (nice-to-have) | `supabase.channel('collections').on('postgres_changes', ...)` |
| Supabase RLS | Performer sees only their own fans/messages | Row-level security policies on collections, fan_tiers, messages |
| Supabase Edge Functions | Future: webhook for email delivery | Not needed for v1 |

## Full Installation Command

```bash
# New dependencies for dashboard + capture + profiles
npm install recharts motion sonner date-fns
```

That's it. Four packages. Everything else is either already installed or handled by Supabase.

## Architecture Notes for Stack

### Server vs Client Component Split

| Feature | Server Component | Client Component |
|---------|-----------------|-----------------|
| `/collect/[slug]` page shell | Fetch performer by slug, generate OG meta | Email form, collect button, tier reveal animation |
| `/dashboard` page shell | Auth check, fetch performer data | Charts, fan list with search/filter, message composer, go-live toggle |
| `/fan/[id]` profile | Fetch fan data, collected artists | Tier badge animations, scan history timeline |

### API Routes Needed

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/collect` | POST | Fan submits email, creates collection + updates tier (exists, needs completion) |
| `/api/qr/[slug]` | GET | Returns QR code PNG (exists, needs 300 DPI enhancement) |
| `/api/dashboard/stats` | GET | Performer's fan count, tier breakdown, recent scans |
| `/api/dashboard/fans` | GET | Paginated fan list with search/filter |
| `/api/messages` | POST | Create and "send" message (stubbed delivery) (exists, needs completion) |
| `/api/go-live` | POST | Mark performer as live at venue (exists, needs completion) |
| `/api/claim` | POST | Performer claims their profile (exists, needs completion) |

## Sources

- [Recharts npm](https://www.npmjs.com/package/recharts) — v3.7.0, React 19 support confirmed
- [Motion npm](https://www.npmjs.com/package/motion) — v12.35.0, successor to framer-motion
- [Sonner npm](https://www.npmjs.com/package/sonner) — v2.0.7, adopted by shadcn/ui and Vercel
- [Supabase SSR docs](https://supabase.com/docs/guides/auth/server-side/nextjs) — middleware pattern for Next.js App Router
- [Supabase Auth quickstart](https://supabase.com/docs/guides/auth/quickstarts/nextjs) — magic link implementation
- [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) — framer-motion to motion migration
- [Recharts React 19 issue](https://github.com/recharts/recharts/issues/4558) — resolved in 3.x
- [LogRocket chart comparison](https://blog.logrocket.com/best-react-chart-libraries-2025/) — Recharts recommended for React dashboards
- [LogRocket toast comparison](https://blog.logrocket.com/react-toast-libraries-compared-2025/) — Sonner vs react-hot-toast
