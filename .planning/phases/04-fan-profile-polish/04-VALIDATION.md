---
phase: 4
slug: fan-profile-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 4 — Validation Strategy

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
| 04-01-01 | 01 | 1 | AUTH-07 | build | `npm run build` | N/A | pending |
| 04-01-02 | 01 | 1 | FAN-01, FAN-02, FAN-03, FAN-04 | build | `npm run build` | N/A | pending |
| 04-01-03 | 01 | 1 | SETT-01, SETT-02, SETT-03, SETT-04 | build | `npm run build` | N/A | pending |
| 04-02-01 | 02 | 1 | DEMO-01, DEMO-02 | build | `npm run build` | N/A | pending |
| 04-02-02 | 02 | 1 | DEMO-05 | build | `npm run build` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — no new test framework needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fan magic link login flow | AUTH-07 | Requires email delivery | Send magic link, click, verify redirect to /profile |
| Fan collection grid shows tier badges | FAN-01, FAN-02 | Visual verification | Log in as fan with collections, verify cards show correctly |
| Smart auth redirect | AUTH-07 | Requires two user types | Test performer login → /dashboard, fan login → /profile |
| Settings display name update | SETT-02 | Requires form interaction | Update name, verify it persists on refresh |
| Dark aesthetic consistency | DEMO-01 | Visual verification | Check all pages use #0B0B0F bg, brand colors, Poppins |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
