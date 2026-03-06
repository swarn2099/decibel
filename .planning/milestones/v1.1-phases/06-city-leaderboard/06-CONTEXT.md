# Phase 6: City Leaderboard - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Public leaderboard page at `/leaderboard` showing top fans by collection count and top performers by fan count. Supports time period filtering (weekly/monthly/all-time). Gamifies attendance with competitive ranking elements. Does NOT include notifications, rewards, or social features beyond viewing rankings.

</domain>

<decisions>
## Implementation Decisions

### Ranking display style
- Podium layout for top 3 positions with larger visual treatment (avatar, name, stat)
- Remaining positions shown as a ranked list below the podium
- Top 10 entries shown by default — tight, exclusive feel for an underground scene
- Both fans and performers leaderboards use the same podium + list pattern

### Podium visual treatment
- #1 position gets pink glow accent (brand primary)
- #2 position gets purple glow accent
- #3 position gets blue glow accent
- Brand gradient colors, NOT gold/silver/bronze — keeps the underground aesthetic

### Gamification elements
- Position change arrows (up/down indicators showing movement since last period)
- Collection count badges displayed prominently with each rank entry
- Stat bars showing relative score visually (proportional fill bars)
- "Your position" highlight — logged-in fan's row gets a glow/highlight treatment
- All four elements combined create a full competitive experience

### Fans vs performers sections
- Claude's Discretion — tabs, stacked sections, or side-by-side. Pick what works best for the layout given the podium + list pattern.

### Fan ranking metric
- Claude's Discretion — total collections, unique performers, or weighted. Pick what makes the most sense given the data model (collections table has fan_id + performer_id).

### Time period filtering
- Weekly / Monthly / All-time filter options (from LEAD-03 requirement)
- Claude's Discretion on filter UI placement and behavior

</decisions>

<specifics>
## Specific Ideas

- Underground scene vibe — this should feel like a club chart, not a corporate dashboard
- Top 10 only creates exclusivity and aspiration — fans want to break into the list
- Position change arrows create urgency and FOMO — "I dropped 2 spots this week"
- "Your position" highlight gives personal stakes even if you're not in top 10

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PerformerGrid` (src/components/performer-grid.tsx): Card pattern with avatar, hover effects — could inform list item design
- `tiers.ts` (src/lib/tiers.ts): TIER_COLORS, TIER_LABELS, TIER_THRESHOLDS — reuse for fan tier display on leaderboard
- `supabase-server.ts` / `supabase-admin.ts`: Server-side data fetching patterns
- Brand color tokens in globals.css: pink, purple, blue, teal, yellow

### Established Patterns
- Server components for data fetching (page.tsx), client components for interactivity
- Dark bg (#0B0B0F), card borders with border-light-gray/10, hover states with brand color accents
- Poppins font via next/font/google
- Lucide icons for UI elements

### Integration Points
- New route: `/leaderboard` (src/app/leaderboard/page.tsx)
- Navbar (src/components/navbar.tsx) — may need leaderboard link
- Database tables: `collections` (fan_id, performer_id), `fans` (id, display_name), `performers` (name, slug, photo_url, follower_count)
- Auth context needed for "your position" highlight (supabase-server.ts session check)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-city-leaderboard*
*Context gathered: 2026-03-06*
