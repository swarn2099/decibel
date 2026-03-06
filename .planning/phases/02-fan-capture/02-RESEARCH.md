# Phase 2: Fan Capture - Research

**Researched:** 2026-03-06
**Domain:** Fan capture flow (QR scan -> email -> collection + tier), animations, toast notifications
**Confidence:** HIGH

## Summary

Phase 2 enhances an already-working fan capture flow. The core collect form, API endpoint, QR generator, OG meta tags, tier system, and repeat-scan handling all exist and function correctly. The work is primarily enhancement: adding `motion` for animations, `sonner` for toasts, fixing QR color inversion, and adding Twitter card meta tags.

The existing code is clean and well-structured. The collect form is a client component (~145 lines), the API route handles fan upsert/collection/tier calculation (~80 lines), and the QR endpoint generates 900px PNGs. The main risk is low: both new libraries (`motion`, `sonner`) are mature, widely adopted, and documented for React 19 + Next.js 15.

**Primary recommendation:** Enhance existing code in-place -- do not refactor or restructure. Add motion animations to the collect button and confirmation reveal, add sonner Toaster to the root layout, fix QR colors, and add twitter:card meta.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- The collect form already exists and works -- enhance it, don't rebuild
- Email is normalized (lowercase, trimmed) -- already implemented in collect-form.tsx
- After collection, show tier badge with scan count and "next tier" progress hint -- already implemented
- Add animation on the "Collect" button press (scale/pulse) and confirmation reveal (fade-in with motion library)
- Toast notification via sonner for success ("Collected!") and errors
- QR endpoint exists at `/api/qr/[slug]` -- fix colors to dark modules on white background
- Keep high error correction level (H) for reliability with phone cameras
- API already handles repeat scans via unique constraint (23505 error code)
- Frontend already shows "Already collected" vs "Collected" -- enhance the repeat experience
- OG meta already implemented with `generateMetadata` -- enhance description and add Twitter card
- Install `motion` (not framer-motion) for animations -- lightweight, React 19 compatible
- Install `sonner` for toast notifications -- minimal setup, dark theme support
- These are the only new packages needed for this phase

### Claude's Discretion
- Exact animation timing and easing curves
- Toast positioning and duration
- Loading state design (spinner vs skeleton vs shimmer)
- Error state copy and styling

### Deferred Ideas (OUT OF SCOPE)
- Fan login to view collection history -- Phase 4
- Push notifications when a collected performer goes live -- v2
- NFC tap as alternative capture method -- v2
- Location-based passive detection -- v2 (requires mobile app)
- Fan passport pre-population via email receipt parsing -- v2
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAPT-01 | Fan scans QR -> lands on /collect/[slug] -> enters email -> collected in under 10 seconds | Flow already works end-to-end. Enhancement only (animations/toasts). Performance not at risk. |
| CAPT-02 | Collection recorded in Supabase with correct performer, capture method | Already implemented in /api/collect route.ts -- fan upsert + collection insert with capture_method: "qr" |
| CAPT-03 | Fan tier updates correctly (1/3/5/10 thresholds) | calculateTier() function and TIER_CONFIG already correct in existing code |
| CAPT-04 | Repeat scan by same email shows updated tier, not duplicate | 23505 unique constraint handling already works. Frontend shows "Already collected" state. |
| CAPT-05 | Collect page has OG meta tags for social sharing | generateMetadata already implemented. Need to add twitter:card = summary_large_image. |
| CAPT-06 | Email normalized (lowercase, trimmed) before storage | Already done: `email.trim().toLowerCase()` in collect-form.tsx |
| CAPT-07 | QR code endpoint generates high-contrast scannable codes (white bg, dark modules) | QR endpoint exists but colors are inverted. Swap dark/light values in qrcode options. |
| DEMO-03 | Animations on collect page (button press, confirmation reveal) using motion | New -- use motion's `motion.button` with whileTap and motion.div with initial/animate for reveal |
| DEMO-04 | Toast notifications for user actions (sonner) | New -- add Toaster to root layout, call toast.success/toast.error in collect form |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| next | 16.1.6 | App Router, server/client components | Installed |
| react | 19.2.3 | UI framework | Installed |
| @supabase/supabase-js | ^2.98.0 | Database client | Installed |
| qrcode | ^1.5.4 | QR code PNG generation | Installed |

### New Dependencies (Phase 2)
| Library | Purpose | Why This One |
|---------|---------|--------------|
| motion | Button press animation, confirmation reveal | Successor to framer-motion. 18M+ monthly downloads. React 19 compatible. Simple API: `motion.div`, `whileTap`, `animate` props. |
| sonner | Toast notifications | Emil Kowalski. Used by OpenAI, Adobe. Zero-config with Next.js App Router. Dark theme built-in. |

### Alternatives Considered
| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| motion | CSS keyframes only | User decision locked: use motion library. CSS-only can't do spring physics or gesture-driven animations. |
| sonner | react-hot-toast | User decision locked: use sonner. Sonner has better dark theme support and simpler API. |

**Installation:**
```bash
npm install motion sonner
```

## Architecture Patterns

### Existing Structure (No Changes Needed)
```
src/
  app/
    layout.tsx              # Add <Toaster /> here
    collect/[slug]/
      page.tsx              # Server component -- add twitter meta
      collect-form.tsx      # Client component -- add motion + toast
    api/
      collect/route.ts      # No changes needed
      qr/[slug]/route.ts    # Fix color values only
```

### Pattern 1: Motion Animation in Client Components
**What:** Wrap interactive elements with `motion.*` components
**When:** Button press feedback, reveal animations on state change
**Example:**
```typescript
// Source: motion.dev/docs/react (GitHub README)
import { motion } from "motion/react"

// Button with tap feedback
<motion.button
  whileTap={{ scale: 0.95 }}
  whileHover={{ scale: 1.02 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Collect
</motion.button>

// Fade-in reveal on mount
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
>
  {/* confirmation content */}
</motion.div>
```

### Pattern 2: Sonner Toast in Next.js App Router
**What:** Global Toaster in root layout, call toast() from any client component
**Example:**
```typescript
// layout.tsx -- add Toaster
import { Toaster } from "sonner"

<body>
  {children}
  <Toaster theme="dark" position="top-center" />
</body>

// collect-form.tsx -- call toast
import { toast } from "sonner"

// On successful collection:
toast.success("Collected!")
// On error:
toast.error("Something went wrong")
// On repeat scan:
toast("Already in your collection")
```

### Pattern 3: QR Color Fix
**What:** Swap dark/light color values in qrcode options
**Example:**
```typescript
// BEFORE (inverted -- hard to scan in dark venues)
color: { dark: "#FFFFFF", light: "#0B0B0F" }

// AFTER (standard -- dark modules on white background)
color: { dark: "#0B0B0F", light: "#FFFFFF" }
```
Note: In QR terminology, "dark" = module color, "light" = background color.

### Pattern 4: Twitter Card Meta Tags
**What:** Add twitter:card metadata for social sharing previews
**Example:**
```typescript
// In generateMetadata return:
return {
  title: `Collect ${performer.name} | DECIBEL`,
  description: `You were on ${performer.name}'s dancefloor. Collect them on Decibel.`,
  openGraph: {
    title: `Collect ${performer.name} | DECIBEL`,
    description: `You were on ${performer.name}'s dancefloor. Collect them on Decibel.`,
    images: performer.photo_url ? [performer.photo_url] : [],
  },
  twitter: {
    card: "summary_large_image",
    title: `Collect ${performer.name} | DECIBEL`,
    description: `You were on ${performer.name}'s dancefloor. Collect them on Decibel.`,
    images: performer.photo_url ? [performer.photo_url] : [],
  },
};
```

### Anti-Patterns to Avoid
- **Rebuilding the collect form:** It works. Enhance in-place only.
- **Adding motion to server components:** `motion` is client-only. The collect page.tsx is a server component -- only use motion inside collect-form.tsx (already a client component).
- **Over-animating:** Dark venue context. Keep animations subtle and fast. No flashy transitions that slow the flow.
- **Putting Toaster in collect page:** Put it in root layout.tsx so it's available app-wide for future phases.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom portal + CSS animation system | sonner | z-index stacking, auto-dismiss, accessibility, mobile touch handling |
| Gesture-driven animation | Manual onTouchStart/End + CSS transforms | motion whileTap | Handles spring physics, cancellation, gesture recognition across devices |
| QR code generation | Canvas API + Reed-Solomon encoding | qrcode package (already installed) | Error correction math, module placement, quiet zone handling |

## Common Pitfalls

### Pitfall 1: Motion Import Path
**What goes wrong:** Importing from `"framer-motion"` instead of `"motion/react"`
**Why:** The library was renamed. Old tutorials reference the wrong import.
**How to avoid:** Always import from `"motion/react"` -- this is the current correct path.

### Pitfall 2: QR "Dark" vs "Light" Confusion
**What goes wrong:** The `qrcode` library's `color.dark` means "module color" and `color.light` means "background color." This is counterintuitive when your app has a dark background.
**How to avoid:** For maximum scannability: `dark: "#000000"` or `"#0B0B0F"`, `light: "#FFFFFF"`. The QR image itself should have a white background regardless of app theme.

### Pitfall 3: Sonner Theme Not Matching
**What goes wrong:** Default sonner toasts appear with light backgrounds on the dark Decibel UI.
**How to avoid:** Set `theme="dark"` on the `<Toaster />` component. Optionally use `richColors` prop for colored success/error states.

### Pitfall 4: AnimatePresence for Exit Animations
**What goes wrong:** motion `initial`/`animate` only handle enter animations. If you later want exit animations (form fading out before confirmation fading in), you need `AnimatePresence`.
**How to avoid:** For Phase 2, simple state-based rendering with enter animations is sufficient. The form disappears instantly and confirmation fades in -- this feels good enough. Don't over-engineer exit animations for this phase.

### Pitfall 5: Server Component + Client Library Boundary
**What goes wrong:** Trying to use `motion` or `toast` in page.tsx (server component) causes build errors.
**How to avoid:** All interactive code stays in collect-form.tsx which already has `"use client"`. The Toaster component in layout.tsx will need layout.tsx to remain a server component -- sonner's Toaster works fine as a child of server components because it's a leaf client component.

## Code Examples

### Complete Collect Button with Motion
```typescript
import { motion } from "motion/react"

<motion.button
  type="submit"
  disabled={loading}
  whileTap={{ scale: 0.95 }}
  whileHover={{ scale: 1.02 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
  className="w-full rounded-xl bg-gradient-to-r from-pink to-purple px-6 py-3 font-semibold transition-colors disabled:opacity-50"
>
  {loading ? "Collecting..." : "Collect"}
</motion.button>
```
Note: Remove the existing Tailwind `hover:scale-[1.02] active:scale-[0.98]` classes since motion handles this now.

### Complete Confirmation Reveal
```typescript
import { motion } from "motion/react"

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
  className="flex w-full max-w-sm flex-col items-center gap-6"
>
  {/* existing confirmation content */}
</motion.div>
```
Note: Replace the existing `animate-in fade-in duration-500` CSS classes with motion's declarative animation.

### Toast Integration
```typescript
import { toast } from "sonner"

// After successful collection:
if (data.already_collected) {
  toast("Already in your collection", { icon: "👋" })
} else {
  toast.success(`Collected ${performer.name}!`)
}

// On error:
toast.error(data.error || "Something went wrong")
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion import | motion/react import | 2024 rebrand | Must use new import path |
| CSS @keyframes for reveals | motion initial/animate | N/A | Declarative, springs, gesture support |
| react-toastify | sonner | 2023+ | Simpler API, better defaults, smaller bundle |

## Open Questions

1. **Sonner version compatibility**
   - What we know: Sonner works with React 19 and Next.js 15 per official docs and shadcn/ui documentation
   - What's unclear: Exact latest version number (npm was inaccessible)
   - Recommendation: `npm install sonner` will get latest. No version pinning needed.

2. **Motion version**
   - What we know: motion is the renamed framer-motion. Import from `"motion/react"`. 18M+ monthly downloads.
   - What's unclear: Exact latest version
   - Recommendation: `npm install motion` will get latest. Works with React 19 per GitHub README.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected -- no test framework installed |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | `npm run build` (build verification only) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAPT-01 | Full collect flow completes | manual | Visit /collect/[slug], enter email, verify response | N/A |
| CAPT-02 | Collection recorded in Supabase | manual | Check Supabase after collection | N/A |
| CAPT-03 | Tier calculates correctly | unit | Could unit test calculateTier() | No |
| CAPT-04 | Repeat scan shows updated tier | manual | Scan same performer twice, verify no duplicate | N/A |
| CAPT-05 | OG meta tags present | smoke | `curl -s /collect/[slug] \| grep og:` | N/A |
| CAPT-06 | Email normalized | unit | Could unit test normalization | No |
| CAPT-07 | QR high-contrast white bg | smoke | `curl -s /api/qr/[slug] -o qr.png` + visual check | N/A |
| DEMO-03 | Animations on collect page | manual | Visual verification | N/A |
| DEMO-04 | Toast notifications | manual | Visual verification | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (must pass)
- **Per wave merge:** `npm run build` + manual verify collect flow
- **Phase gate:** Full build green + manual walkthrough of collect flow

### Wave 0 Gaps
- No test framework installed. For this phase, `npm run build` is the primary automated verification.
- Most requirements are UI/UX and best verified visually or via manual walkthrough.
- OG meta tags can be verified with curl (checking HTML output for meta tags).
- QR color fix can be verified by downloading the QR PNG and confirming white background.

## Sources

### Primary (HIGH confidence)
- Existing codebase: collect-form.tsx, page.tsx, route.ts, qr route.ts -- read and analyzed directly
- [motion GitHub README](https://github.com/motiondivision/motion) -- import path, basic API
- [sonner official site](https://sonner.emilkowal.ski/) -- setup, API, positioning

### Secondary (MEDIUM confidence)
- [motion.dev/docs/react](https://motion.dev/docs/react) -- official docs (JS-heavy page, partial extraction)
- [shadcn/ui sonner docs](https://ui.shadcn.com/docs/components/radix/sonner) -- Next.js 15 + React 19 compatibility confirmed
- [npm motion page](https://www.npmjs.com/package/motion) -- 18M+ monthly downloads (from search results)

### Tertiary (LOW confidence)
- None -- all findings verified against official sources or existing code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- both libraries are mature, well-documented, and explicitly chosen by user
- Architecture: HIGH -- existing code is clean and well-structured; changes are surgical
- Pitfalls: HIGH -- pitfalls identified from direct code analysis and known library behavior

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable libraries, no fast-moving concerns)
