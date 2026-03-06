---
phase: 2
slug: fan-capture
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification + npm run build |
| **Config file** | next.config.ts (existing) |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full build must pass
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | CAPT-01, CAPT-02, CAPT-06 | build | `npm run build` | N/A | pending |
| 02-01-02 | 01 | 1 | CAPT-03, CAPT-04 | build | `npm run build` | N/A | pending |
| 02-01-03 | 01 | 1 | CAPT-07 | build | `npm run build` | N/A | pending |
| 02-01-04 | 01 | 1 | CAPT-05 | build | `npm run build` | N/A | pending |
| 02-01-05 | 01 | 1 | DEMO-03, DEMO-04 | build | `npm run build` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — no new test framework needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| QR scan → collect flow under 10s | CAPT-01 | Requires phone camera | Scan QR with phone, enter email, time the flow |
| Repeat scan shows updated tier | CAPT-04 | Requires sequential scans | Scan same performer twice, verify tier update |
| QR scannable in low light | CAPT-07 | Requires venue conditions | Print QR, test in dark room with phone camera |
| OG meta preview on social | CAPT-05 | Requires social platform | Share /collect/[slug] link, check preview card |
| Animation feedback on collect | DEMO-03 | Visual verification | Watch button press animation and confirmation reveal |
| Toast notification appears | DEMO-04 | Visual verification | Collect a performer, verify toast appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
