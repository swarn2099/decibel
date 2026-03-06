---
phase: 1
slug: auth-security
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 1 — Validation Strategy

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
| 01-01-01 | 01 | 1 | AUTH-04 | build | `npm run build` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | AUTH-05 | build | `npm run build` | ✅ | ⬜ pending |
| 01-01-03 | 01 | 1 | AUTH-06 | build | `npm run build` | ✅ | ⬜ pending |
| 01-01-04 | 01 | 1 | AUTH-03 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — no new test framework needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Magic link email delivery | AUTH-01 | Requires real email | Send magic link, verify email arrives, click to auth |
| Session persistence | AUTH-02 | Browser state | Login, refresh browser, verify still on /dashboard |
| Route protection redirect | AUTH-04 | Browser navigation | Visit /dashboard while logged out, verify redirect to /auth/login |
| Claim security | AUTH-05 | Requires two accounts | Try claiming a profile with mismatched user, verify rejection |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
