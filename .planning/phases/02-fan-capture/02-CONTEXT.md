# Phase 2: Fan Capture - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Fan scans a QR code at a venue, lands on `/collect/[slug]`, enters email, gets collected with correct tier progression. Repeat scans show updated tier without duplicates. QR codes are high-contrast and scannable in low-light. OG meta tags work for social sharing. Animations and toast notifications provide feedback. This phase does NOT include the performer dashboard (Phase 3) or fan login/profiles (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Capture Flow UX
- The collect form already exists and works — enhance it, don't rebuild
- Email is normalized (lowercase, trimmed) — already implemented in collect-form.tsx
- After collection, show tier badge with scan count and "next tier" progress hint — already implemented
- Add animation on the "Collect" button press (scale/pulse) and confirmation reveal (fade-in with motion library)
- Toast notification via sonner for success ("Collected!") and errors

### QR Code Generation
- QR endpoint exists at `/api/qr/[slug]` — already generates 900px PNG with error correction H
- Current colors are inverted (white modules on dark bg) — need to flip to dark modules on white background for maximum scannability in dark venues
- Keep high error correction level (H) for reliability with phone cameras

### Repeat Scan Handling
- API already handles repeat scans via unique constraint (23505 error code) — returns `already_collected: true`
- Frontend already shows "Already collected" vs "Collected" — enhance the repeat experience
- Show tier progress and "you're X scans away from [next tier]" — already implemented
- Do NOT create duplicate collection records — working correctly

### OG Meta Tags
- Already implemented in collect page with `generateMetadata` — has title, description, and performer photo
- Enhance description: "You were on {name}'s dancefloor. Collect them on Decibel."
- Add Twitter card meta (twitter:card = summary_large_image)

### New Dependencies
- Install `motion` (not framer-motion) for animations — lightweight, React 19 compatible
- Install `sonner` for toast notifications — minimal setup, dark theme support
- These are the only new packages needed for this phase

### Claude's Discretion
- Exact animation timing and easing curves
- Toast positioning and duration
- Loading state design (spinner vs skeleton vs shimmer)
- Error state copy and styling

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/collect/[slug]/collect-form.tsx`: Full working collect form with email input, tier display, progress hints — needs animation/toast enhancement only
- `src/app/api/collect/route.ts`: Working API with fan upsert, collection insert, tier calculation, repeat detection
- `src/app/api/qr/[slug]/route.ts`: Working QR generator with `qrcode` package, 900px, error correction H
- `src/app/collect/[slug]/page.tsx`: Server component with `generateMetadata` for OG tags
- `TIER_CONFIG` in collect-form.tsx: Complete tier system with colors, labels, thresholds

### Established Patterns
- Server components for data fetching, client components for interactivity
- Admin client (`createSupabaseAdmin()`) for API route writes
- Server client (`createSupabaseServer()`) for page-level reads with RLS
- Design tokens: bg=#0B0B0F, pink/purple/blue/teal for tier colors
- `animate-in fade-in` CSS classes already used for basic transitions

### Integration Points
- `/api/collect` POST endpoint — fan capture mutation
- `/api/qr/[slug]` GET endpoint — QR image generation
- `collections` and `fan_tiers` tables — data storage
- `performers` table — slug lookup for collect page
- Dashboard (Phase 3) will read collection data created here

</code_context>

<specifics>
## Specific Ideas

- The collect flow should feel instant and rewarding — like unlocking an achievement
- Dark venue context: fans are holding phones in dark rooms, so the collect page should be high-contrast and easy to read
- The tier progression ("2 more scans to unlock Early Access") creates the hook for repeat visits
- QR codes need to be scannable from printed stickers on DJ booths and bar surfaces

</specifics>

<deferred>
## Deferred Ideas

- Fan login to view collection history — Phase 4
- Push notifications when a collected performer goes live — v2
- NFC tap as alternative capture method — v2
- Location-based passive detection — v2 (requires mobile app)
- Fan passport pre-population via email receipt parsing — v2

</deferred>

---

*Phase: 02-fan-capture*
*Context gathered: 2026-03-06*
