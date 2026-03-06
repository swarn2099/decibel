# Domain Pitfalls

**Domain:** Live music fan-performer engagement platform (QR capture, tiered loyalty, performer dashboard)
**Researched:** 2026-03-06

---

## Critical Pitfalls

Mistakes that cause rewrites, broken demos, or fundamental trust erosion.

### Pitfall 1: QR Scan Fails in Dark Venues

**What goes wrong:** QR codes printed on dark backgrounds with low contrast are unreadable by phone cameras in nightclub/venue lighting (strobes, UV, near-darkness). The entire product premise breaks if the scan fails at the moment it matters.

**Why it happens:** Developers test QR codes in well-lit offices. Nightclub lighting is 10-50 lux with color-shifting LEDs, strobes, and haze. Phone cameras auto-adjust exposure and often can't lock focus on a dark QR code in these conditions.

**Consequences:** Fan walks away. Zero collection. Lost trust with performer who printed codes. "This doesn't work" reputation spreads in a tight-knit scene.

**Prevention:**
- Generate QR codes with white/light background and dark modules (standard contrast) -- never invert to match the dark brand aesthetic
- Add a white border (quiet zone) of at least 4 modules around the QR code
- Make the QR code minimum 2 inches / 5cm when printed
- Test QR scanning in actual low-light conditions before any venue deployment
- Consider adding the performer's short URL below the QR as a manual fallback (`decibel.fm/collect/dj-name`)

**Detection:** If QR generation endpoint (`/api/qr/[slug]`) uses dark backgrounds or brand colors for the QR modules, this is actively broken. Check the QR code contrast ratio.

**Phase:** Fan Capture (Phase 2) -- must be right from day one.

---

### Pitfall 2: Email-Only Fan Identity Creates Ghost Accounts

**What goes wrong:** Using bare email as the fan identifier (no verification, no auth) means typos create orphaned accounts, and anyone can "collect" as someone else's email. Fan tier data becomes unreliable.

**Why it happens:** Minimizing friction (just an email field) is correct for first-scan UX, but zero verification means the data is only as good as the user's typing on a phone at 2 AM in a club.

**Consequences:**
- Fan types `john@gmial.com` -- new orphan fan record, tier progress lost
- Fan later types `john@gmail.com` -- separate record, scan count doesn't accumulate
- Malicious user enters someone else's email repeatedly, inflating their tier
- Performer's "fan count" is inflated with bad data, undermining dashboard trust

**Prevention:**
- Normalize emails before storage: lowercase, trim whitespace
- On repeat visits (returning fan), pre-fill or suggest: "Welcome back? Enter your email to see your tier"
- For v1 demo: accept the tradeoff but document it. Email validation (format check) is table stakes
- For v2: add optional email verification link that confirms + merges duplicate accounts
- Add a unique constraint on `(fan_id, performer_id, event_date)` -- already exists in schema, good

**Detection:** Query fans table for near-duplicate emails (Levenshtein distance). If you see `john@gmail.com` and `jhon@gmail.com` both with collections, this pitfall is active.

**Phase:** Fan Capture (Phase 2). Accept for demo, plan merge tooling for post-launch.

---

### Pitfall 3: Performer Claim Flow Has No Verification

**What goes wrong:** The current claim flow shows 50 unclaimed performers and lets any authenticated user click to claim any of them. A random person could sign up via magic link and claim DJ Heather's profile.

**Why it happens:** For speed, the claim prompt just lists unclaimed performers with a button. There's no verification that the authenticated user is actually that performer.

**Consequences:** Performer identity theft. A claimed profile can't easily be reclaimed. Trust destruction with the exact users (performers) you need as advocates.

**Consequences for demo:** If this is demo'd to a performer and they see anyone could claim their page, credibility tanks instantly.

**Prevention:**
- For demo: limit the claim list to performers whose scraped email/social matches the authenticated user's email, or require a manual approval step
- Add a "Request to Claim" flow instead of instant claiming -- performer submits request, admin approves
- Alternatively: generate a unique claim link per performer (emailed or DM'd to them) that ties to their profile
- At minimum: add a confirmation step ("Are you [DJ Name]? This cannot be undone.")

**Detection:** Check `/api/claim` route -- if it accepts any `user_id` + `performer_id` without verification, this is live.

**Phase:** Performer Dashboard (Phase 3). Must be addressed before any performer sees the product.

---

### Pitfall 4: Supabase Magic Link Emails Land in Spam or Get Blocked

**What goes wrong:** Supabase's built-in email sender has low deliverability. Magic links go to spam, performer can't log in, demo fails.

**Why it happens:** Supabase uses a shared email domain for free-tier magic links. Gmail, Outlook, and corporate email filters aggressively flag these. Email link scanners (Microsoft Defender, Proofpoint) can also pre-click the magic link URL and invalidate it before the user opens it.

**Consequences:** Performer can't authenticate. The entire dashboard becomes inaccessible. Demo-killing.

**Prevention:**
- For demo: have a backup auth method ready (create a test performer account manually in Supabase Auth dashboard, use a known email that receives the link)
- Configure a custom SMTP sender in Supabase (SendGrid, Resend, or Postmark) with a verified domain
- Test magic link delivery to Gmail, Outlook, and iCloud before demo
- Add a "check spam" instruction on the login page
- Consider adding OTP (6-digit code) as alternative to magic link -- Supabase supports `signInWithOtp` with `shouldCreateUser: true` and `type: 'email'`, which sends a code instead of a link

**Detection:** Test the login flow right now. If the magic link email doesn't arrive within 30 seconds to a Gmail account, this is active.

**Phase:** Performer Dashboard (Phase 3). Test before demo.

---

## Moderate Pitfalls

### Pitfall 5: Dashboard Shows Empty State to New Performers

**What goes wrong:** A performer claims their profile, opens the dashboard, and sees all zeros: 0 fans, 0 scans, empty chart, empty fan list. It feels dead.

**Prevention:**
- Design intentional empty states: "No fans yet. Share your QR code to start collecting." with a prominent QR download button
- Show the performer's existing profile data (photo, bio, upcoming shows from events table) so the dashboard doesn't feel barren
- Pre-seed a "welcome" message in the message composer as a template
- If demoing: pre-create a few test fan collections for the demo performer account

**Phase:** Performer Dashboard (Phase 3).

---

### Pitfall 6: Tier Thresholds Feel Unreachable for Fans

**What goes wrong:** Tiers at 1/3/5/10 scans sound reasonable in a PRD but feel impossibly slow in practice. A fan who sees their favorite DJ twice a year needs 5 years to hit "inner circle." The tier system feels meaningless.

**Prevention:**
- For v1: keep the thresholds as-is but make the first tier feel rewarding (not just "network" which sounds generic)
- Display progress visually: "2 more scans to unlock Early Access" with a progress bar
- Consider counting scans across ALL performers toward a global fan level (separate from per-performer tiers) to reward platform engagement
- Name the tiers something that feels underground/exclusive, not corporate: "Floor" / "Regular" / "VIP" / "Inner Circle" or scene-specific language

**Phase:** Fan Capture (Phase 2) for display, Fan Profile for global progress.

---

### Pitfall 7: Collect Page Doesn't Work Offline or on Slow Connections

**What goes wrong:** Fan scans QR at a venue with 500 people on the same cell tower. Page takes 15 seconds to load or times out. Collection fails silently.

**Prevention:**
- The collect page must be extremely lightweight: minimal JS, no heavy images, server-rendered
- Show a loading state immediately (skeleton) -- never a blank white/dark screen
- Handle API errors gracefully: "Something went wrong. Try again." with a retry button
- Consider service worker for offline queuing in future (out of scope for v1 but design the API to be idempotent so retries are safe -- already handled by the unique constraint)

**Detection:** Run Lighthouse on `/collect/[slug]` in mobile mode with throttled 3G. If performance score is below 80, this needs attention.

**Phase:** Fan Capture (Phase 2).

---

### Pitfall 8: Message Composer Without Delivery is Confusing

**What goes wrong:** Performer composes and "sends" a message, but delivery is stubbed for v1. Performer expects fans received it. Fans never see it. Performer loses trust.

**Prevention:**
- Make it crystal clear in the UI: "Messages will be delivered when email delivery is configured" or "Preview mode -- messages are saved but not sent yet"
- Show message history as "Drafts" or "Queued" not "Sent"
- Never show fake open/click stats
- For demo: either stub with a clear "coming soon" label, or actually integrate a basic SendGrid/Resend send so at least one real email goes out

**Phase:** Performer Dashboard (Phase 3).

---

### Pitfall 9: RLS Policies Block Dashboard Queries

**What goes wrong:** Supabase Row Level Security is enabled on all tables (see schema), but the dashboard queries use server-side client with the user's session. If RLS policies don't allow a performer to read their own fan_tiers, collections, and fans data, every query returns empty arrays. Dashboard looks empty even with data.

**Why it happens:** RLS is enabled in the migration but only public read policies exist for performers, venues, and events. No policies exist for fans, collections, fan_tiers, or messages. The dashboard server component uses `createSupabaseServer()` which respects RLS.

**Prevention:**
- Add RLS policies for: performers can read collections/fan_tiers/fans where performer_id matches their claimed performer
- Or: use `createSupabaseAdmin()` (service role, bypasses RLS) for dashboard server queries where the user is already authenticated
- Test every dashboard query with a real authenticated user, not just the admin client

**Detection:** If the dashboard code uses `createSupabaseServer()` and there are no RLS policies for `collections`, `fan_tiers`, or `fans`, the dashboard will return empty data for authenticated performers. Check this immediately.

**Phase:** Performer Dashboard (Phase 3). Blocking issue.

---

## Minor Pitfalls

### Pitfall 10: Slug Collisions Between Performers

**What goes wrong:** Two performers named "DJ Mike" get the same slug. Database unique constraint fails on the second insert.

**Prevention:** Slug generation must append a disambiguator (city, number) when collision detected. The scrapers should already handle this but verify.

**Phase:** Already relevant (scrapers built), but verify before demo.

---

### Pitfall 11: OG Image Preview Shows Broken Image

**What goes wrong:** The collect page sets `openGraph.images` to the performer's `photo_url`, but 126/429 performers have no photo. Sharing a collect link for those performers shows a broken image preview or no preview.

**Prevention:**
- Use a default Decibel-branded OG image when no performer photo exists
- Generate dynamic OG images via `/api/og/[slug]` using `next/og` (ImageResponse) with performer name rendered on a branded template

**Phase:** Fan Capture (Phase 2).

---

### Pitfall 12: Fan Profile Page Exposes Other Fans' Data

**What goes wrong:** If the fan profile page isn't properly scoped, a fan could see other fans' emails or collection data. Privacy violation.

**Prevention:**
- Fan profile must only show the authenticated fan's own data
- Never expose fan emails to other fans
- Performer dashboard should show fan emails only to the performer who owns that audience
- Add RLS policies that scope fan data to the fan themselves and their connected performers

**Phase:** Fan Profile page. Design RLS from the start.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Fan Capture (QR scan) | QR unreadable in dark venues | White-on-dark QR codes, manual URL fallback |
| Fan Capture (email input) | Typo creates orphan account, no verification | Normalize email, accept tradeoff for v1, plan merge tooling |
| Fan Capture (mobile perf) | Slow load on congested cell networks | Lightweight page, skeleton loading, idempotent API |
| Performer Auth | Magic link goes to spam | Test delivery, add OTP fallback, custom SMTP |
| Performer Claim | No identity verification | Restrict claim to matching email or manual approval |
| Performer Dashboard | RLS blocks all queries | Add policies or use admin client for server queries |
| Performer Dashboard | Empty state feels dead | Design intentional empty states with CTAs |
| Message Composer | Stubbed delivery misleads performer | Label as "preview/draft" not "sent" |
| Fan Profile | Data privacy leaks | Scope all queries to authenticated fan only |
| Tier System | Thresholds feel unreachable | Visual progress, rewarding language, global fan level |

---

## Sources

- [NN/g QR Code Usability Guidelines](https://www.nngroup.com/articles/qr-code-guidelines/)
- [QR Code Best Practices for Legibility](https://qrcodekit.com/guides/best-practices-for-qr-code-legibility/)
- [OpenQR: QR Code Scanning Problems and Fixes](https://openqr.io/qr-code-scanning-problems-9-reasons-fixes-that-work/)
- [Supabase Magic Link Troubleshooting](https://www.restack.io/docs/supabase-knowledge-supabase-magic-link-troubleshooting)
- [Supabase Passwordless Login Docs](https://supabase.com/docs/guides/auth/passwordless-login/auth-magic-link)
- [Fan Loyalty Best Practices 2025 - FanZone](https://www.fanzone.me/blog/fan-loyalty-community-best-practices-2025)
- [ESSEC Sports Chair: Incentivising Fan Engagement](https://sports-chair.essec.edu/resources/student-insights/incentivising-fan-engagement)
- [FanCircles: Fan Engagement Platforms](https://www.fancircles.com/fan-engagement-platforms/)
- [Antavo: Entertainment Loyalty Programs Guide](https://antavo.com/blog/entertainment-loyalty-programs/)
- Codebase analysis: `/src/app/api/collect/route.ts`, `/src/app/dashboard/page.tsx`, `/src/app/collect/[slug]/page.tsx`
