# Research Summary: Decibel Mobile App (React Native / Expo)

**Domain:** Location-based live music fan passport mobile app
**Researched:** 2026-03-08
**Overall confidence:** HIGH

## Executive Summary

The Expo + React Native ecosystem in early 2026 is mature and well-suited for Decibel's mobile app. Expo SDK 54 (React Native 0.81) is the target -- it's the current stable release with New Architecture enabled by default, and it's battle-tested since September 2025. SDK 55 is in beta but not stable enough for a greenfield production app.

The stack centers on NativeWind v4.2 for styling (preserving Swarn's Tailwind mental model from the web app), TanStack Query v5 for server state management with Supabase, Zustand for lightweight client state, and the full Expo ecosystem for native capabilities (location, push notifications, camera, haptics, maps). The critical compatibility discovery is that NativeWind v4 requires Tailwind CSS v3.4.x (NOT v4.x which the web app uses) and Reanimated v4 (which NativeWind v4.2.0+ supports). This version pinning is non-negotiable.

The most important architectural decision is the hybrid API approach: direct Supabase queries for reads (leveraging RLS and offline caching via TanStack Query) and calling the existing Next.js web API routes over HTTPS for complex mutations (collect, add-artist, badge evaluation). This avoids duplicating business logic while keeping the mobile app fast and offline-capable.

Session storage requires a MMKV + SecureStore combo because Supabase JWT sessions exceed expo-secure-store's 2048 byte limit. This is the official Supabase recommendation for Expo apps. The pattern is well-documented: generate an encryption key with expo-crypto, store it in SecureStore (iOS Keychain / Android Keystore), use it to encrypt MMKV which holds the actual session data.

## Key Findings

**Stack:** Expo SDK 54 + NativeWind v4.2 (Tailwind 3.4.17) + TanStack Query v5 + Zustand + Supabase JS + MMKV/SecureStore. ~25 packages total, all version-verified.

**Architecture:** Expo Router v4 file-based routing, 5-tab layout (Passport/Explore/Scan/Activity/Profile), direct Supabase reads + web API for mutations. Auth via magic link deep links with SecureStore persistence.

**Critical pitfall:** NativeWind v4 + Tailwind v4.x incompatibility. The web app uses Tailwind v4, but the mobile app MUST use Tailwind v3.4.17. This is a known constraint. Also: push notifications and many native modules don't work in Expo Go on SDK 54 -- must use Development Builds from day one.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation + Auth** - Project init, NativeWind config, Supabase client with MMKV adapter, magic link auth with deep linking, tab navigation shell
   - Addresses: Project setup, auth flow, session persistence
   - Avoids: NativeWind/Tailwind version mismatch, Expo Go limitations (use dev builds immediately)
   - Rationale: Everything downstream depends on auth and the styling system working correctly

2. **Core Screens (Read-Only)** - Passport timeline, artist profiles, search with autocomplete, explore/discover
   - Addresses: The hero screen (passport), content browsing, TanStack Query integration
   - Avoids: Empty state confusion (design intentional empty states from the start)
   - Rationale: Read-only screens are lowest risk, highest value for early TestFlight testing

3. **QR Scan + Collection** - Camera-based QR scanner, collection creation via web API, optimistic updates, offline queue
   - Addresses: Core product action, the "aha moment" on mobile
   - Avoids: Offline collection failures (queue in MMKV, sync on reconnect)
   - Rationale: Depends on auth + display layer from Phases 1-2

4. **Location + Maps** - Foreground location permission, venue proximity detection, dark-styled map, venue markers
   - Addresses: THE killer native feature, the reason to build a mobile app
   - Avoids: Background location pitfall (foreground-only for v1), geofence limit overflow (max 20 iOS / 100 Android)
   - Rationale: Most complex native integration, most permission-sensitive, needs collection flow working end-to-end

5. **Push Notifications** - Expo Push Service setup, FCM/APNs config, token registration, notification handling + deep linking
   - Addresses: Re-engagement, contextual "artist playing near you" alerts
   - Avoids: Notification fatigue (frequency capping, per-type toggles from day one)
   - Rationale: Independent of location but needs auth for token registration

6. **Polish + Animations** - Lottie micro-animations, haptic feedback, share cards, badge unlock celebrations, onboarding flow
   - Addresses: Emotional engagement, shareability, delight moments
   - Avoids: Over-engineering animations before core flows work
   - Rationale: Polish layer on top of working features, can ship incrementally

**Phase ordering rationale:**
- Auth + styling foundation must come first because every screen depends on them
- Read-only screens before write operations to validate data layer with low risk
- QR scan before location because QR is simpler and the primary capture method
- Location is the most complex native integration -- defer until collection flow is proven
- Push notifications are parallel-trackable but need dev builds which Phase 1 establishes
- Polish is last because premature animation work on unstable screens wastes effort

**Research flags for phases:**
- Phase 1: NativeWind v4.2 + Reanimated v4 compat needs careful testing. Deep link callback for magic link needs platform-specific testing (iOS universal links vs Android app links).
- Phase 3: Offline queue sync strategy needs design. What happens when queued collections conflict with server state?
- Phase 4: Geofence registration strategy (which venues to monitor, how to rotate) needs deeper research during that phase.
- Phase 5: Expo Push Service receipt handling and retry logic needs phase-specific research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm, Expo changelog, and official docs. NativeWind + Reanimated compat confirmed via GitHub discussions. |
| Features | HIGH | Feature landscape based on competitor analysis of Beli, Strava, Swarm, Momento, Spotify Wrapped. Clear table stakes vs differentiators. |
| Architecture | HIGH | Expo Router + TanStack Query + Zustand pattern is well-documented with official quickstarts from Expo and Supabase. |
| Pitfalls | HIGH | NativeWind/Tailwind version trap, SecureStore size limit, Expo Go limitations, geofence limits all verified from official docs and GitHub issues. |

## Gaps to Address

- **NativeWind v4.2 + Reanimated v4 real-world stability:** GitHub discussions confirm compatibility, but production reports are limited. Phase 1 should include a stress test of NativeWind animations with Reanimated v4.
- **Monorepo vs separate repo:** Research recommends starting as a separate `decibel-mobile/` directory and extracting shared types later. But if the web app moves to a monorepo first, the mobile setup changes.
- **Expo Push Service quotas:** Free tier limits are generous but not documented with exact numbers. May need phase-specific research if user count grows quickly.
- **Apple App Store review for location:** Foreground-only location is lower friction but Apple still requires clear usage description. Review the exact wording needed during Phase 4.
- **Share extension (expo-share-intent):** Listed as a differentiator in FEATURES.md but has Apple review complexity. Needs phase-specific feasibility check.
