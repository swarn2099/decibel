# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Growth Mechanics + Content Engine

**Shipped:** 2026-03-06
**Phases:** 3 | **Plans:** 5 | **Sessions:** 1

### What Was Built
- Shareable fan collection cards with dynamic OG image generation for social sharing
- Public leaderboard with podium UI, fan/performer tabs, time period filtering
- Content generator pipeline (DJ Spotlight, Scene Roundup, Product Teaser) with weekly batch orchestration
- Copy-to-clipboard + Share on X integration

### What Worked
- Content generators were correctly scaffolded from prior session — 07-01 needed zero code changes
- Pre-fetching all leaderboard time periods server-side eliminated loading states
- Wave-based execution kept phases clean — no dependency issues
- Single-session milestone completion (planning + execution in one sitting)

### What Was Inefficient
- v1.0 DASH requirement checkboxes weren't updated when Phase 3 shipped — caused confusion during milestone completion
- SUMMARY.md one_liner fields weren't populated, making automated accomplishment extraction fail
- Some ROADMAP.md progress table rows had stale data (wrong plan counts, missing milestone labels)

### Patterns Established
- OG image generation via Next.js ImageResponse (Satori) — no Playwright needed for social cards
- Content generation via React components -> Playwright screenshot at 1080x1080
- Optional `outputDir` parameter pattern for generators that work standalone or in batch mode

### Key Lessons
1. Keep requirement checkboxes in sync during execution, not just at milestone completion
2. Always populate SUMMARY.md one_liner field — it's the source for automated reporting
3. Content scripts that query Supabase should be tested against live data early, not just scaffolded

### Cost Observations
- Model mix: ~80% sonnet (executors, checker), ~20% opus (orchestrator)
- Sessions: 1
- Notable: Phase 7 execution was very fast — generators worked on first run

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 | 4 | Initial GSD setup, wave-based execution |
| v1.1 | 1 | 3 | Added content pipeline, leaderboard gamification |

### Top Lessons (Verified Across Milestones)

1. Keep tracking artifacts (checkboxes, progress tables) in sync during execution
2. Test against real data early — scaffolded code often works first try when DB schema is stable
