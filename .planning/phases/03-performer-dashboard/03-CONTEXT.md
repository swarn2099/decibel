# Phase 3: Performer Dashboard - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Performer dashboard with fan analytics, audience management, message composer, QR download, and Go Live status. The dashboard already has extensive implementation — this phase is about completing missing pieces, adding proper empty states, installing recharts for a real chart, labeling messages as draft/preview, and ensuring demo readiness. This phase does NOT include fan-side features (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### What Already Exists (enhance, don't rebuild)
- Dashboard page.tsx: Auth check, admin client queries, performer lookup, claim prompt — all working
- dashboard-client.tsx: Full tabbed UI (overview/fans/messages) with header, stat cards, custom bar chart, recent scans, fan table with search/filter, message composer, Go Live button, QR download link, logout
- /api/go-live: Creates events with is_live flag
- /api/messages: Saves messages to DB with recipient count, stubbed delivery (TODO comment)

### Stats Cards (DASH-01)
- Already implemented: Total Fans, Network, Early Access, Inner Circle stat cards
- Missing: "Secret" tier stat card — only 3 of 4 tiers shown (network, early_access, inner_circle but not secret)
- Fix: Add Secret tier card to the stats row

### Recent Scans (DASH-02)
- Already shows last 30 days with date, fan email, venue, capture method
- Working correctly — just verify it renders well with empty state

### Scan Chart (DASH-03)
- Currently uses custom CSS bar chart (buildWeeklyData function, 13 weeks)
- Decision: Keep the custom bar chart — it looks good and avoids adding recharts dependency
- The custom chart is lightweight, matches the dark aesthetic, and shows hover tooltips
- No need to install recharts for this

### Fan List (DASH-04)
- Search and tier filter already working in FansTab
- Table shows fan name/email, tier badge, scan count, last scan date
- Empty state shows "No fans found."

### QR Download (DASH-05)
- Already implemented as download link in header pointing to /api/qr/[slug]
- Works correctly — downloads PNG

### Message Composer (DASH-06, DASH-07)
- Tier selector, subject, body, send button all working
- Messages saved to DB via /api/messages
- CRITICAL: Must label messages as "draft/preview" — v1 doesn't actually deliver emails
- Add a notice: "Messages are saved as drafts. Email delivery coming soon."
- Toast notification on send (sonner already installed)

### Go Live (DASH-08)
- Working: venue picker dropdown, confirm button, LIVE indicator with pulse
- Creates event in DB via /api/go-live

### Claim Flow (DASH-09)
- Working: ClaimPrompt shows unclaimed performers, form submits to /api/claim
- /api/claim secured in Phase 1 (session-based identity)

### Empty States (DASH-10)
- Recent scans has empty state: "No scans yet. Share your QR code to get started."
- Fan list has empty state: "No fans found."
- Need to verify messages tab has appropriate empty/draft state
- All empty states should feel intentional, not broken

### Claude's Discretion
- Whether to add date-fns for date formatting or keep native Date methods
- Exact wording of the draft/preview label on messages
- Any minor layout adjustments for demo polish

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dashboard-client.tsx`: 500+ line client component with full tab system, stat cards, fan table, message form, Go Live — needs minor fixes only
- `page.tsx`: Server component with all data queries (admin client) already working
- `TIER_COLORS` and `TIER_LABELS` maps — consistent tier styling
- `buildWeeklyData()` — custom chart data aggregation
- Sonner `toast()` available app-wide (installed in Phase 2)

### Established Patterns
- Server component fetches all data, passes to single client component
- Admin client for all dashboard queries (bypasses RLS, secured by auth check)
- Lucide icons for UI elements
- Gradient buttons (pink to purple) for primary actions

### Integration Points
- `/api/claim` — secured in Phase 1
- `/api/go-live` — creates events
- `/api/messages` — saves messages (delivery stubbed)
- `/api/qr/[slug]` — QR PNG download
- `fan_tiers`, `collections`, `fans`, `messages` tables — all queried

</code_context>

<specifics>
## Specific Ideas

- The dashboard is the demo centerpiece — it needs to look polished and intentional even with zero fans
- Messages should clearly say "draft" or "preview" so performers don't think emails were sent
- The custom bar chart looks good — no need to add recharts complexity
- Toast notifications (sonner) should confirm Go Live and message actions

</specifics>

<deferred>
## Deferred Ideas

- Real email delivery via SendGrid — v2
- Message open/click tracking — v2
- Rich text message composer — v2
- Real-time fan count via Supabase Realtime — v2
- Dashboard analytics export — v2

</deferred>

---

*Phase: 03-performer-dashboard*
*Context gathered: 2026-03-06*
