---
phase: 23-polish-app-store-prep
plan: 03
subsystem: infra
tags: [expo, eas, testflight, ios, app-store, production-config]

# Dependency graph
requires:
  - phase: 23-02
    provides: "Polished mobile app with offline cache, animations, pull-to-refresh"
provides:
  - "Production-ready app.json with bundleIdentifier, dark mode, iOS permissions"
  - "EAS build profiles configured for TestFlight distribution"
  - "Apple submit placeholders in eas.json for App Store submission"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Production Expo config with dark-first splash and iOS permission strings"]

key-files:
  created: []
  modified:
    - /home/swarn/decibel-mobile/app.json
    - /home/swarn/decibel-mobile/eas.json

key-decisions:
  - "bundleIdentifier set to com.decibel.app (iOS and Android)"
  - "Dark userInterfaceStyle with #0B0B0F splash -- no light mode"
  - "All 7 required Expo plugins listed (router, font, secure-store, linking, location, notifications, haptics)"
  - "Apple submit credentials left as TODO placeholders for Swarn to fill"

patterns-established:
  - "Production config: dark splash bg #0B0B0F, portrait-only, no tablet UI"

requirements-completed: [POLISH-09, POLISH-10]

# Metrics
duration: 1min
completed: 2026-03-09
---

# Phase 23 Plan 03: TestFlight Prep Summary

**Production app.json with bundleIdentifier, dark splash, iOS permissions, and EAS build profiles for TestFlight distribution**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-09T04:33:48Z
- **Completed:** 2026-03-09T04:34:54Z
- **Tasks:** 2 (1 auto + 1 checkpoint auto-approved)
- **Files modified:** 2

## Accomplishments
- Configured production app.json with bundleIdentifier "com.decibel.app", dark mode, dark splash screen
- Added iOS permission descriptions for location and camera usage
- Updated plugins list with all 7 required Expo plugins
- Set up eas.json with Apple submit placeholders for Swarn to fill
- Removed light-themed defaults (white splash bg, light adaptive icon bg)

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure production app.json and prepare EAS build for TestFlight** - `b828870` (chore)
2. **Task 2: Verify TestFlight config and build status** - auto-approved (checkpoint, no code changes)

**Plan metadata:** (pending)

## Files Created/Modified
- `/home/swarn/decibel-mobile/app.json` - Production Expo config with bundleIdentifier, dark mode, permissions, plugins
- `/home/swarn/decibel-mobile/eas.json` - EAS build profiles with Apple submit placeholders

## Decisions Made
- bundleIdentifier set to "com.decibel.app" for both iOS and Android
- Dark-only userInterfaceStyle (no light mode toggle) -- the underground doesn't have a light mode
- All 7 required Expo plugins explicitly listed in plugins array
- Apple submit credentials (appleId, ascAppId, appleTeamId) left as TODO placeholders

## Deviations from Plan

### Notes

- **EAS CLI not installed:** The plan called for triggering an EAS build, but eas-cli is not installed on this VM (neither globally nor as a project dependency). Swarn will need to install EAS CLI (`npm install -g eas-cli`), authenticate (`eas login`), and run the build (`eas build --platform ios --profile preview`) from his local machine or a CI environment with Xcode signing capabilities.
- **EAS project ID not set:** The plan mentioned checking `eas project:info` -- without EAS CLI this was not possible. Swarn should run `eas init` to link the project and get the projectId for `expo.extra.eas.projectId`.

## Issues Encountered
- EAS CLI not available on VM -- build trigger deferred to Swarn's local environment where Apple signing credentials are available

## User Setup Required

Swarn needs to complete these steps to get the TestFlight build:

1. **Install EAS CLI:** `npm install -g eas-cli`
2. **Login:** `eas login` (with Expo account)
3. **Initialize project:** `cd /home/swarn/decibel-mobile && eas init`
4. **Fill Apple credentials in eas.json:** Replace TODO placeholders with real Apple ID, ASC App ID, Team ID
5. **Trigger build:** `eas build --platform ios --profile preview`
6. **App Store screenshots:** Capture from simulator at 6.7" (iPhone 15 Pro Max, 1290x2796) and 5.5" (iPhone 8 Plus, 1242x2208) showing passport, map, collection, leaderboard

## Next Phase Readiness
- App configuration is production-ready
- EAS build can be triggered once Swarn authenticates with Apple credentials
- This is the final plan in Phase 23 and the final phase of v3.0

---
*Phase: 23-polish-app-store-prep*
*Completed: 2026-03-09*
