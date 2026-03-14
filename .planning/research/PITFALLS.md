# Domain Pitfalls

**Domain:** React Native Expo mobile app for live music fan engagement (location-based detection, push notifications, maps, deep linking)
**Researched:** 2026-03-08

---

## Critical Pitfalls

Mistakes that cause rewrites, app crashes, or store rejections.

### Pitfall 1: NativeWind v4 Metro/Babel Misconfiguration

**What goes wrong:** NativeWind v4 requires specific metro.config.js and babel.config.js setup. Using `nativewind/babel` in babel.config.js can cause Metro to misinterpret the app entry file as a Babel config in Expo SDK 53+. Styles silently fail to apply, or the app crashes on launch.
**Why it happens:** NativeWind wraps Tailwind CSS for React Native, requiring a CSS preprocessing step in Metro that is easy to misconfigure. The setup changed between v2, v4, and v5.
**Consequences:** Styles don't render, app crashes on boot, or hours wasted debugging "why is my className not working."
**Prevention:**
- Use `withNativeWind` wrapper in metro.config.js (not manual Metro config)
- babel.config.js: add `nativewind/babel` preset AND set `jsxImportSource: "nativewind"` in babel-preset-expo options
- Create `global.css` at project root with `@tailwind base/components/utilities`
- Create `nativewind-env.d.ts` for TypeScript support
- Consider NativeWind v5 if starting fresh -- it removes the Babel plugin requirement entirely
**Detection:** Tailwind classes render as no-op. Components have no styling despite correct className props.
**Phase:** Phase 1 (project scaffolding). Get this right on day one or every component built afterward is broken.
**Confidence:** HIGH -- documented in official NativeWind docs and multiple GitHub issues.

---

### Pitfall 2: Supabase Magic Link Deep Linking Broken on Mobile

**What goes wrong:** Magic link emails contain a redirect URL that must deep link back into the app. On React Native, the token extraction from the URL fails silently, session is never established, and the user sees a blank screen or gets bounced to the web.
**Why it happens:** Supabase magic links redirect to a URL with hash fragments containing the access token. React Native's `Linking` API and Expo Router handle URL parsing differently than web browsers. The `Linking.useURL()` method doesn't work correctly for this -- you must use `useLinkingURL()` from expo-linking.
**Consequences:** Auth is completely broken. Users click magic link, nothing happens. Session never persists.
**Prevention:**
- Set `detectSessionInUrl: false` in Supabase client config for React Native
- Configure `persistSession: true` and `autoRefreshToken: true`
- Use `@react-native-async-storage/async-storage` as the storage adapter
- Register a custom URL scheme in app.json (`scheme: "decibel"`)
- Configure Supabase redirect URL to use `decibel://` scheme
- Extract tokens from deep link URL manually and call `supabase.auth.setSession()`
- **Recommended alternative:** Skip magic links on mobile entirely. Use OTP flow -- send the magic link email but extract the OTP token and call `supabase.auth.verifyOtp({ email, token })`. This avoids deep linking for auth entirely and is far more reliable.
**Detection:** Auth flow works in Expo Go browser but fails on device builds. Users report "link doesn't open the app."
**Phase:** Phase 1 (auth setup). Auth is the foundation -- broken auth blocks everything.
**Confidence:** HIGH -- documented across multiple Supabase GitHub discussions (#6698, #9435, #10754) and official docs.

---

### Pitfall 3: Background Location App Store Rejection

**What goes wrong:** Apple rejects the app for requesting background location access without adequate justification. Google Play rejects for not completing the background location access declaration form.
**Why it happens:** Both stores heavily scrutinize background location. Apple requires a visible, user-facing feature that clearly justifies "Always" location access. Google requires a video demo of the feature and a completed declaration form. Decibel's passive venue detection is the PRIMARY capture method, so background location is essential -- but reviewers often reject first submissions.
**Consequences:** App blocked from stores. 1-2 week delays per rejection cycle.
**Prevention:**
- **Apple:** Add a detailed `NSLocationAlwaysAndWhenInUseUsageDescription` that explicitly says "Decibel detects when you're at a live music venue to automatically log your attendance"
- **Apple:** Show an in-app explainer screen BEFORE triggering the system permission dialog
- **Apple:** Implement the location feature using geofencing (significant location changes), NOT continuous GPS tracking -- Apple is more lenient with geofencing
- **Google:** Complete the Background Location Access declaration in Play Console with a video walkthrough
- **Google:** Request foreground permission first, then background separately (mandatory since Android 11)
- **Both:** Ship v1 with foreground-only location + QR as primary. Add background location in a subsequent update once the app has established legitimacy with reviewers.
**Detection:** Rejection email citing guideline 5.1.1 (Apple) or location policy (Google).
**Phase:** Phase 3+ (location features). Do NOT request background location in v1 submission. Build store credibility first.
**Confidence:** HIGH -- well-documented rejection pattern, 15% of iOS apps rejected in 2025.

---

### Pitfall 4: expo-location Permission Flow Breaks on iOS

**What goes wrong:** Calling `requestBackgroundPermissionsAsync()` without first getting foreground permission causes iOS to collapse both prompts into one confusing dialog. If the user selects "Allow Once," subsequent calls to `requestForegroundPermissionsAsync()` return `granted` but the permission expires when the app closes. On Android, `getCurrentPositionAsync()` hangs indefinitely on subsequent launches after permission was already granted.
**Why it happens:** iOS treats permission requests differently based on order. "Allow Once" is indistinguishable from "Allow While Using" in the API response. Android has a known bug where location hangs on cold starts.
**Consequences:** Location silently stops working. Users think the app is broken. Venue detection fails intermittently.
**Prevention:**
- Always request foreground permissions first, then background as a separate step
- Add a 5-second timeout wrapper around `getCurrentPositionAsync()` -- it can hang forever on Android
- Never assume permission status persists -- check on every app foreground event
- Handle "Allow Once" by re-requesting on next launch (iOS provides no way to distinguish it)
- Use `getLastKnownPositionAsync()` as a fast fallback before `getCurrentPositionAsync()`
- On Android, if location hangs, fall back to `getLastKnownPositionAsync()` after timeout
**Detection:** Location works on first launch but fails on subsequent launches. Intermittent "location unavailable" errors.
**Phase:** Phase 2 (location integration). Permission flow must be bulletproof before building venue detection on top.
**Confidence:** HIGH -- documented in expo/expo issues #33911, #39851, #42084, #22020.

---

### Pitfall 5: Push Notification Token Lifecycle Mismanagement

**What goes wrong:** Push tokens become stale (user uninstalls, gets new phone, or revokes permissions), but the server keeps sending to dead tokens. Expo push service returns errors, delivery rates drop, and Apple/Google may throttle your sender reputation.
**Why it happens:** FCM/APNs tokens are ephemeral. They change on app reinstall, OS update, or device change. Most devs store the token once and never refresh it. Expo's push service wraps FCM/APNs but doesn't solve token lifecycle.
**Consequences:** Push delivery rate degrades over time. 30-50% of tokens can go stale within 6 months. Apple may throttle your push certificate.
**Prevention:**
- Re-register push token on EVERY app launch, not just first launch
- Store both Expo push token AND native device token in `fans` table
- Implement token cleanup: when Expo returns `DeviceNotRegistered` error, delete that token from DB
- Track `token_updated_at` timestamp -- tokens older than 90 days without refresh are likely dead
- Push notifications don't work on simulators/emulators -- test on real devices from day one
- Use development builds (not Expo Go) for push testing -- Expo Go dropped Android push support in SDK 53
**Detection:** Push delivery rate declining over time. `DeviceNotRegistered` errors increasing in server logs.
**Phase:** Phase 2 (push notification setup). Token management architecture must be designed upfront.
**Confidence:** HIGH -- well-established mobile engineering pattern, confirmed in Expo docs.

---

## Moderate Pitfalls

### Pitfall 6: Expo Router Deep Linking Fails in Killed State on iOS

**What goes wrong:** When the app is completely killed (not backgrounded) and a user taps a deep link (e.g., from a shared passport URL or performer profile), iOS fails to route to the correct screen. The app opens to the home screen instead.
**Why it happens:** `getInitialURL` doesn't fire correctly when the app is launched from a killed state on iOS. Expo Router's navigation state isn't ready when the URL arrives.
**Prevention:**
- Use `expo-linking`'s `useLinkingURL()` hook (NOT `Linking.useURL()`) to catch initial URLs
- Set `initialRouteName` in layout files to ensure back navigation works from deep-linked screens
- Do NOT export `unstable_settings` (even empty) from layout files -- it breaks deep linking entirely
- Test deep links in all three states: foreground, background, and killed
- For shared passport URLs, use Universal Links (iOS) / App Links (Android) with a fallback to web
**Detection:** Deep links work when app is open but fail when app is closed.
**Phase:** Phase 2 (navigation/routing setup). Critical for passport sharing feature.
**Confidence:** MEDIUM -- documented in expo/expo #37028 and expo/router #818, fixes in progress.

---

### Pitfall 7: react-native-maps Dark Mode and Marker Rendering Issues

**What goes wrong:** After Expo SDK 54 and react-native-maps 1.26+, Android maps auto-match system dark/light mode without developer control. Markers break, custom styling via `customMapStyle` stops applying, and dark mode maps render with invisible UI overlays.
**Why it happens:** Google Maps SDK changed how `userInterfaceStyle` works. react-native-maps 1.26+ has documented marker rendering regressions on Android.
**Consequences:** Map is unusable in dark mode (Decibel is dark-first). Venue markers disappear or render incorrectly.
**Prevention:**
- Pin react-native-maps to a known stable version (test before upgrading)
- Use Google Cloud Console to create two Map IDs (light and dark) with cloud-based styling rather than client-side `customMapStyle`
- Set `userInterfaceStyle` prop explicitly on MapView
- On iOS, use Apple Maps (default) which has better dark mode support out of the box
- Test maps on both Android and iOS physical devices -- simulator rendering differs significantly
**Detection:** Map renders white/bright in dark-themed app. Markers disappear after SDK upgrade.
**Phase:** Phase 3 (map/venue features). Validate map rendering early in a spike before building features on it.
**Confidence:** MEDIUM -- active GitHub issues (#5798, #5812, #5444), situation is evolving.

---

### Pitfall 8: OTA Update Crashes from runtimeVersion Mismatch

**What goes wrong:** An OTA update is pushed via `eas update` that references native modules not present in the installed binary. The app crashes on launch for all users who haven't updated from the app store.
**Why it happens:** `expo-updates` uses `runtimeVersion` to determine compatibility. If you add a native dependency (e.g., `expo-camera`) and push an OTA update without bumping `runtimeVersion`, old binaries try to load code that calls missing native modules.
**Consequences:** App crashes for all users on the old binary. Only fix is a new app store submission, which takes 1-3 days for review.
**Prevention:**
- Use `runtimeVersion: { policy: "fingerprint" }` in app.config -- it auto-detects native changes
- Never assume a dependency update is JS-only -- check if it includes native code
- Test OTA updates against the PREVIOUS binary version before publishing
- Known SDK 54 bug: runtimeVersion doesn't sync correctly in Android AAB builds (APK works fine) -- verify before shipping
- Set up a staging channel (`eas update --channel staging`) to test updates before production
**Detection:** Crash reports spike immediately after an `eas update` push. Users report "app won't open."
**Phase:** Phase 4+ (when OTA updates are enabled). Don't enable expo-updates until the native API surface stabilizes.
**Confidence:** HIGH -- documented in Expo docs and expo/expo #41694.

---

### Pitfall 9: Font Loading Race Condition on App Launch

**What goes wrong:** Custom fonts (Poppins, in Decibel's case) haven't finished loading when components render. Text appears in system font for a flash, or worse, the app crashes with "fontFamily 'Poppins' is not a system font."
**Why it happens:** `useFonts` hook is async. If `SplashScreen.preventAutoHideAsync()` isn't called early enough, or if a component renders before fonts are loaded, you get a race condition.
**Consequences:** Visual flash of unstyled text (FOUT), or crash on screens that reference the custom font.
**Prevention:**
- Call `SplashScreen.preventAutoHideAsync()` at module scope (outside component), not inside useEffect
- Use `useFonts` hook in root layout, hide splash screen only when `fontsLoaded` is true
- Never reference a custom font family name in styles without a loaded check
- If using NativeWind, configure fonts in tailwind.config.js `fontFamily` AND load them with `useFonts`
- Known issue: fonts may fail to reload on Expo CLI hot reload -- restart dev server if fonts disappear
**Detection:** Flash of system font on app launch. "Font not loaded" errors in development.
**Phase:** Phase 1 (project scaffolding). Part of initial app shell setup.
**Confidence:** HIGH -- documented in expo/expo #21885 and Expo font docs.

---

### Pitfall 10: EAS Build Failures from .gitignore and Credentials

**What goes wrong:** EAS Build uploads your project to Expo's cloud builders, but files in `.gitignore` are excluded. If Metro resolves a file that's gitignored (e.g., local config, generated files), the build fails with "None of these files exist." Separately, iOS credential mismatches (wrong team, stale provisioning profile) cause silent build failures.
**Why it happens:** Local dev works because the gitignored files exist on your machine. EAS builders don't have them. Credential issues compound when switching between personal and team Apple Developer accounts.
**Consequences:** Builds fail. Can take hours to diagnose if you don't know to check .gitignore.
**Prevention:**
- Run `eas build --local` first to catch file resolution issues before burning cloud build credits
- Check that `.env` files needed at build time are configured as EAS Secrets, not gitignored local files
- For iOS: use `eas credentials` to audit provisioning profiles and certificates before first build
- For Android: keep the keystore in EAS (managed credentials) -- don't manage it yourself
- If Gradle OOMs on Android, add `"resourceClass": "large"` to eas.json build config
- Always commit `package-lock.json` -- EAS uses `npm ci` which requires it
**Detection:** Build succeeds locally but fails on EAS. Error message references missing files or credential issues.
**Phase:** Phase 1 (CI/CD setup). Configure EAS Build and do a successful test build before writing features.
**Confidence:** HIGH -- documented in Expo troubleshooting docs.

---

## Minor Pitfalls

### Pitfall 11: FlashList Image Flickering During Fast Scroll

**What goes wrong:** When using FlashList (recommended over FlatList for performance) with `expo-image`, rapid scrolling causes images to flicker or show the wrong artist avatar because FlashList aggressively recycles views.
**Prevention:**
- Use `expo-image` with the `recyclingKey` prop set to a unique identifier (e.g., performer ID)
- Use `placeholder` prop with a blurhash or low-res thumbnail for instant visual feedback
- Prefetch images for the next page of results using `Image.prefetch()`
**Phase:** Phase 2 (list screens -- artist grid, passport timeline).
**Confidence:** HIGH -- documented expo-image behavior.

---

### Pitfall 12: Android Back Button Behavior in Expo Router

**What goes wrong:** Android hardware back button doesn't navigate as expected in tab-based layouts. It may exit the app instead of going to the previous tab or screen.
**Prevention:**
- Set `initialRouteName` in tab layout to define the "home" tab
- Use `router.canGoBack()` checks before custom back handling
- Test back button behavior on Android specifically -- iOS swipe-back gestures work differently
**Phase:** Phase 2 (navigation setup).
**Confidence:** MEDIUM -- common React Navigation pattern issue.

---

### Pitfall 13: Expo Go vs Development Build Feature Gaps

**What goes wrong:** Developers build features using Expo Go, then discover they don't work in production builds. Push notifications, background location, and some native modules are unavailable in Expo Go.
**Prevention:**
- Set up development builds (`eas build --profile development`) from day one
- Never rely on Expo Go for features that touch: push notifications, background tasks, location geofencing, or custom native modules
- Expo SDK 53+ dropped Android push support from Expo Go entirely
**Phase:** Phase 1 (dev environment setup).
**Confidence:** HIGH -- official Expo documentation.

---

### Pitfall 14: Supabase Realtime Subscriptions Leak on Navigation

**What goes wrong:** Subscribing to Supabase Realtime channels (e.g., live fan count at a venue) without cleaning up on screen unmount causes memory leaks and stale event handlers. Multiple subscriptions accumulate as users navigate.
**Prevention:**
- Always `channel.unsubscribe()` in useEffect cleanup
- Use a singleton pattern or context provider for shared subscriptions
- Limit concurrent channel subscriptions (Supabase free tier has limits)
**Phase:** Phase 3 (realtime features like live fan count).
**Confidence:** HIGH -- standard React Native lifecycle issue.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Project scaffolding (Phase 1) | NativeWind v4 config wrong, font loading race, EAS Build failures | Follow exact config from NativeWind docs. Test EAS build on day one. Use dev builds, not Expo Go. |
| Auth implementation (Phase 1) | Magic link deep linking broken on mobile | Use OTP verification flow instead of deep link redirect. Avoid deep linking for auth entirely. |
| Navigation/routing (Phase 2) | Deep links fail in killed state, Android back button | Test all three app states (foreground, background, killed). Set initialRouteName in every layout. |
| Push notifications (Phase 2) | Token lifecycle mismanagement, no simulator testing | Re-register token every launch. Store expiry timestamps. Use real devices from day one. |
| Location features (Phase 3) | Permission flow breaks, background location rejected by stores | Ship foreground-only first. Add background in a later update. Request permissions with in-app explainer. |
| Map integration (Phase 3) | Dark mode rendering broken, marker issues on Android | Spike map rendering early. Pin react-native-maps version. Use cloud-based map styling. |
| List performance (Phase 2-3) | Image flickering, animation jank on artist grids | Use FlashList + expo-image with recyclingKey. Prefetch images. Use Reanimated for animations. |
| OTA updates (Phase 4+) | runtimeVersion mismatch crashes all users | Use fingerprint policy. Test against previous binary. Stage before prod. Don't enable until native surface stabilizes. |

---

## Sources

- [NativeWind v4 Installation](https://www.nativewind.dev/docs/getting-started/installation)
- [NativeWind v5 Migration](https://www.nativewind.dev/v5/guides/migrate-from-v4)
- [NativeWind Metro/Babel Issue #1486](https://github.com/nativewind/nativewind/issues/1486)
- [NativeWind "plugins is not a valid Plugin property" Error](https://medium.com/@emrelutfi/react-native-expo-nativewind-setup-and-plugins-is-not-a-valid-plugin-property-error-solution-69114248592f)
- [Supabase Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Supabase Magic Link + Expo Discussion #6698](https://github.com/orgs/supabase/discussions/6698)
- [Supabase Magic Link RN Discussion #9435](https://github.com/orgs/supabase/discussions/9435)
- [Supabase Deep Linking + Expo Discussion #10754](https://github.com/orgs/supabase/discussions/10754)
- [Supabase Auth Quickstart - React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Supabase Auth-JS Magic Link Issue #657](https://github.com/supabase/auth-js/issues/657)
- [Expo Router Deep Linking Docs](https://docs.expo.dev/linking/into-your-app/)
- [Expo Router iOS Deep Link Killed State #37028](https://github.com/expo/expo/issues/37028)
- [unstable_settings Breaks Deep Linking #818](https://github.com/expo/router/issues/818)
- [expo-location Docs](https://docs.expo.dev/versions/latest/sdk/location/)
- [expo-location Background Permission #33911](https://github.com/expo/expo/issues/33911)
- [expo-location getCurrentPosition Hangs #39851](https://github.com/expo/expo/issues/39851)
- [expo-location Background Permission Status Bug #42084](https://github.com/expo/expo/issues/42084)
- [expo-location Denied Permission Cannot Restore #22020](https://github.com/expo/expo/issues/22020)
- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Expo Notifications SDK Reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [react-native-maps Marker Issues #5798](https://github.com/react-native-maps/react-native-maps/issues/5798)
- [react-native-maps Dark Mode Auto-Switch #5812](https://github.com/react-native-maps/react-native-maps/issues/5812)
- [react-native-maps Dark Mode Switching #5444](https://github.com/react-native-maps/react-native-maps/issues/5444)
- [Expo Runtime Versions Docs](https://docs.expo.dev/eas-update/runtime-versions/)
- [runtimeVersion AAB Bug #41694](https://github.com/expo/expo/issues/41694)
- [Expo OTA Update Best Practices](https://expo.dev/blog/5-ota-update-best-practices-every-mobile-team-should-know)
- [Expo Fonts Docs](https://docs.expo.dev/develop/user-interface/fonts/)
- [useFonts Loading Issue #21885](https://github.com/expo/expo/issues/21885)
- [EAS Build Troubleshooting](https://docs.expo.dev/build-reference/troubleshooting/)
- [Apple App Store Rejection Reasons 2025](https://twinr.dev/blogs/apple-app-store-rejection-reasons-2025/)
- [Google Background Location Policy](https://support.google.com/googleplay/android-developer/answer/9799150)
