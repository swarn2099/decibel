# Technology Stack

**Project:** Decibel Mobile (React Native / Expo)
**Researched:** 2026-03-08

## Target SDK Version

**Expo SDK 54** (React Native 0.81) -- the current stable release as of March 2026. SDK 55 is in beta but not stable enough for a greenfield project shipping to production. SDK 54 is the last SDK with Legacy Architecture opt-out, but New Architecture is default and we should embrace it from day one.

SDK 54 was released September 2025 and is battle-tested. SDK 55 beta dropped recently but has not stabilized.

**Confidence: HIGH** -- verified via Expo changelog and npm registry.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| expo | ~54.x | App framework | Industry standard for RN, handles native modules, builds, OTA updates. Expo is officially recommended by React Native docs. | HIGH |
| react-native | 0.81.x | UI runtime | Bundled with SDK 54, New Architecture enabled by default | HIGH |
| typescript | ~5.x | Type safety | Already used in web codebase, non-negotiable for a multi-platform project | HIGH |
| expo-router | ~4.x | File-based routing | Comes with SDK 54, typed routes, deep linking, parallel to Next.js App Router patterns Swarn already knows | HIGH |

### Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| nativewind | ~4.2.x | Tailwind CSS for RN | Direct translation of existing Tailwind classes from web codebase. v4.2.0+ patches Reanimated v4 compat. Use with Tailwind CSS v3.4.x (NOT v4.x -- that's for NativeWind v5 which is pre-release). | HIGH |
| tailwindcss | 3.4.17 | CSS utility engine | NativeWind v4 requires Tailwind v3, not v4. Pin this exact version. | HIGH |

**Why NOT NativeWind v5:** Pre-release, API still evolving, docs warn against production use. v4.2.x is stable and proven.

**Why NOT Unistyles:** Swarn's web codebase uses Tailwind extensively. NativeWind lets you reuse the same class names and mental model. Switching styling paradigms between web and mobile creates cognitive overhead.

**Why NOT Tamagui:** Heavier, opinionated component library. Decibel has a custom design language (Nerve aesthetic) that doesn't map to Tamagui's design tokens cleanly.

### State Management & Data Fetching

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @tanstack/react-query | ~5.x | Server state, caching | Handles Supabase data fetching with automatic caching, background refetch, optimistic updates. Pairs perfectly with Supabase JS client. | HIGH |
| zustand | ~5.x | Client state | Lightweight global store for UI state (current tab, theme, onboarding progress). Not needed for server state -- that's TanStack Query's job. | HIGH |

**Why NOT Redux:** Overkill. Zustand does the same thing in 10% of the boilerplate.

**Why NOT Jotai:** Zustand is simpler for the global store pattern Decibel needs (auth state, UI preferences). Jotai's atomic model shines for complex form state, which isn't a primary pattern here.

**Why NOT React Context alone:** Fine for theme/auth, but TanStack Query replaces the need for context-based data management. Zustand handles the rest without provider nesting.

### Database & Auth

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @supabase/supabase-js | ~2.x | Database client, auth, realtime | Already the backend. Same client works in React Native. Supabase has official Expo quickstart guides. | HIGH |
| react-native-mmkv | ~3.x | Fast encrypted local storage | Supabase sessions exceed expo-secure-store's 2048 byte limit. MMKV is 30x faster than AsyncStorage, supports encryption. Store encryption key in SecureStore, session data in MMKV. | HIGH |
| expo-secure-store | ~14.x | Keychain/Keystore access | Stores the MMKV encryption key securely. iOS Keychain, Android Keystore. Small values only (tokens, keys). | HIGH |
| expo-crypto | ~14.x | Encryption key generation | Generates the encryption key stored in SecureStore for MMKV. Official Supabase + Expo recommendation for this pattern. | HIGH |

**Why NOT AsyncStorage alone:** Unencrypted, slow, no size guarantees. Auth tokens and sessions must be encrypted at rest.

**Why NOT expo-secure-store alone for sessions:** 2048 byte limit. Supabase JWT + refresh token + metadata exceeds this. The MMKV + SecureStore combo is the official Supabase recommendation for Expo.

**Supabase storage adapter pattern:**
```typescript
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { MMKV } from 'react-native-mmkv';

// 1. Get or create encryption key from SecureStore
let encryptionKey = await SecureStore.getItemAsync('mmkv-encryption-key');
if (!encryptionKey) {
  encryptionKey = Crypto.randomUUID();
  await SecureStore.setItemAsync('mmkv-encryption-key', encryptionKey);
}

// 2. Initialize encrypted MMKV
const storage = new MMKV({ id: 'supabase-storage', encryptionKey });

// 3. Pass to Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem: (key) => storage.getString(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // important for RN
  },
});
```

### Location

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| expo-location | ~18.x | Foreground location | Venue proximity detection for passive check-in. Foreground-only for v1. | HIGH |

**Configuration notes:**
- Request `whenInUse` permission, never `always` for v1
- Set `NSLocationWhenInUseUsageDescription` in app.json: "Decibel uses your location to detect when you're at a live show"
- Android: `ACCESS_FINE_LOCATION` permission
- Request permission contextually (when user taps "Check In" or visits venue page), NOT on app launch

**Why foreground-only:** Background location triggers aggressive App Store review, drains battery, requires `NSLocationAlwaysUsageDescription` justification. Foreground is sufficient for the "am I at this venue right now?" check. Background can be added in a later milestone if needed.

### Push Notifications

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| expo-notifications | ~0.30.x | Push notification handling | Local and remote notifications. Expo Push Service simplifies FCM/APNs. | HIGH |

**Configuration notes:**
- Use **Expo Push Service** (not direct FCM) -- it abstracts both FCM (Android) and APNs (iOS)
- Upload FCM V1 service account key (not legacy server key) to Expo dashboard
- Upload APNs key (.p8) to Expo dashboard
- Store `ExpoPushToken` in the `fans` table as `expo_push_token` column
- Starting SDK 54: push notifications do NOT work in Expo Go, must use Development Build
- Use `expo-dev-client` for testing push notifications during development

**Why Expo Push Service over direct FCM:** Unified API for both platforms, no server-side FCM/APNs splitting logic, built-in receipt tracking, free tier is generous.

### Maps

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-native-maps | ~2.x | Map rendering | Venue map with custom dark styling. Platform-native maps (Apple Maps iOS, Google Maps Android). | HIGH |

**Dark mode approach:**
- Use `customMapStyle` prop with a dark JSON style (generate at snazzymaps.com or Google Maps Styling Wizard)
- Match the `#0B0B0F` background aesthetic with near-black map tiles
- Custom markers with pink (#FF4D6A) and purple (#9B6DFF) accent colors
- `userInterfaceStyle="dark"` as fallback on iOS
- For Android: `customMapStyle` is the only reliable dark mode approach

**Why NOT MapLibre/Mapbox:** react-native-maps uses platform-native maps (Apple Maps on iOS, Google Maps on Android). No additional API key costs for basic usage. Mapbox charges per map load after free tier.

### Images

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| expo-image | ~2.x | Optimized image loading | Built-in caching, blurhash placeholders, progressive loading. First-party Expo library with guaranteed SDK compatibility. | HIGH |

**Why NOT react-native-fast-image:** Abandoned/unmaintained since 2023. expo-image is actively maintained by Expo team, supports blurhash (great for the dark aesthetic -- show a color placeholder before image loads), and has transition animations built in.

**Usage pattern for performer avatars:**
```typescript
<Image
  source={{ uri: performer.image_url }}
  placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
  contentFit="cover"
  transition={300}
  style={{ width: 80, height: 80, borderRadius: 40 }}
/>
```

### Animations & Gestures

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-native-reanimated | ~4.1.x | Performant animations | Runs on UI thread, 60fps guaranteed. NativeWind v4.2.0+ is compatible with Reanimated v4. Required by NativeWind for CSS animation support. | HIGH |
| react-native-gesture-handler | ~2.x | Touch gestures | Swipe-to-dismiss, pull-to-refresh, pan gestures for passport card. Bundled with Expo SDK 54. | HIGH |
| lottie-react-native | ~7.x | Micro-animations | Badge unlock animations, check-in success, tier-up celebrations. JSON-based, designer-friendly, lightweight. | MEDIUM |
| react-native-worklets | ~1.x | Worklet runtime | Separated from Reanimated in v4 for better modularity. Required peer dependency of Reanimated v4. | HIGH |

**Why Reanimated v4 (not v3):** SDK 54 ships with Reanimated v4. NativeWind v4.2.0+ patches compatibility. Going against the SDK's bundled version creates dependency conflicts. Reanimated v4 only supports New Architecture (Fabric), which is default in SDK 54.

**Lottie use cases for Decibel:**
- QR scan success: checkmark burst animation (~2-3 seconds)
- Badge unlock: confetti/glow animation
- Tier progression: level-up effect
- Loading states: pulsing decibel waveform
- Source free Lottie JSON files from LottieFiles.com or create custom ones in After Effects

### Visual Effects

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| expo-linear-gradient | ~14.x | Gradient backgrounds | Decibel's purple-to-pink gradient aesthetic. Drop-in replacement for CSS gradients. | HIGH |
| expo-blur | ~14.x | Blur effects | Frosted glass modals, blurred backgrounds behind overlays. Native blur = performant. | HIGH |
| expo-haptics | ~14.x | Tactile feedback | Vibration on QR scan success, badge unlock, tier progression. Makes the app feel physical and alive. | HIGH |

**Haptics usage:**
```typescript
import * as Haptics from 'expo-haptics';

// QR scan success
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Badge unlock
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Button tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

### Fonts

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| expo-font | ~13.x | Custom font loading | Load Poppins (already the web font). Use `useFonts` hook + `expo-splash-screen` to prevent FOUT. | HIGH |
| @expo-google-fonts/poppins | ~0.2.x | Poppins font package | Pre-packaged Poppins weights. Cleaner than manually bundling .ttf files. | MEDIUM |

**Loading pattern:**
```typescript
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  // ...
}
```

### Build & Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| eas-cli | latest | Cloud builds + submissions | EAS Build handles iOS/Android builds without local Xcode/Android Studio. EAS Submit pushes to App Store/Play Store. | HIGH |
| expo-updates | ~0.28.x | OTA updates | Push JS-only changes without App Store review. Channel-based (production/staging). Fingerprint detection for native change safety. | HIGH |
| expo-dev-client | ~5.x | Development builds | Replaces Expo Go for testing. Push notifications and native modules don't work in Expo Go as of SDK 54. | HIGH |

**EAS Build profiles (eas.json):**
```json
{
  "cli": { "version": ">= 15.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "swarn@decibel.app", "ascAppId": "TBD" },
      "android": { "serviceAccountKeyPath": "./google-services.json" }
    }
  }
}
```

**OTA update strategy:**
- Use `runtimeVersion: { policy: "fingerprint" }` in app.json -- auto-detects native changes
- JS-only changes: push OTA via `eas update --channel production`
- Native changes (new SDK, new native module): new binary build required
- Fingerprint catches incompatible OTA updates automatically
- Always test OTA on preview channel before pushing to production

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-splash-screen | ~0.30.x | Splash screen control | Keep visible during font/data loading |
| expo-status-bar | ~2.x | Status bar styling | Light content on dark backgrounds |
| expo-constants | ~17.x | App metadata | Build version, device info |
| expo-linking | ~7.x | Deep linking | QR code scan -> app open, universal links |
| expo-camera | ~16.x | QR scanning | In-app QR scanner for collecting performers |
| react-native-safe-area-context | ~5.x | Safe area insets | NativeWind peer dependency, notch handling |
| react-native-screens | ~4.x | Native screen containers | Bundled with expo-router, optimizes navigation |
| react-native-svg | ~15.x | SVG rendering | Custom badge graphics, waveform visualizations |
| expo-web-browser | ~14.x | In-app browser | Spotify OAuth redirect, external links |
| date-fns | ~4.x | Date formatting | "Collected 3 days ago", event date display |
| lucide-react-native | ~0.4.x | Icon set | Same icon library as web codebase, native variant |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Expo (managed) | Bare React Native CLI | Expo handles 95% of native needs. Bare workflow adds build complexity with no benefit for Decibel's feature set. |
| Styling | NativeWind v4.2 | NativeWind v5 | v5 is pre-release, unstable API. v4.2.x is production-ready. Migrate to v5 later when stable. |
| Styling | NativeWind v4.2 | Unistyles 2.0 | Swarn already thinks in Tailwind. Switching paradigms between web and mobile is a productivity killer. |
| Navigation | Expo Router v4 | React Navigation v7 (direct) | Expo Router wraps React Navigation with file-based routing. Same mental model as Next.js App Router. |
| Data fetching | TanStack Query v5 | SWR | TanStack Query has better mutation support, devtools, and React Native compatibility. |
| Images | expo-image | react-native-fast-image | RNFI is abandoned. expo-image has blurhash, transitions, and first-party support. |
| Storage | MMKV + SecureStore | AsyncStorage | Unencrypted, 6x slower. Auth tokens must be encrypted at rest. |
| Maps | react-native-maps | Mapbox GL | Mapbox costs money after free tier. RN Maps uses native platform maps for free. |
| State | Zustand | Redux Toolkit | 90% less boilerplate for the same result at this app's scale. |
| Push | Expo Push Service | Direct FCM/APNs | Unified API, no server-side platform splitting, free. |
| Animations | Reanimated v4 | Moti | Moti wraps Reanimated with extra abstraction. Direct Reanimated is more flexible and one fewer dependency. |

---

## Installation

```bash
# Create project
npx create-expo-app decibel-mobile --template tabs

# Core dependencies (use npx expo install for SDK-compatible versions)
npx expo install expo-router expo-font expo-splash-screen expo-status-bar expo-constants expo-linking

# Styling (CRITICAL: pin tailwindcss to 3.4.17, NOT v4)
npm install nativewind@~4.2.0 tailwindcss@3.4.17
npx expo install react-native-reanimated react-native-safe-area-context

# Data & Auth
npm install @supabase/supabase-js @tanstack/react-query zustand
npx expo install react-native-mmkv expo-secure-store expo-crypto

# Location & Maps
npx expo install expo-location react-native-maps

# Notifications
npx expo install expo-notifications expo-dev-client

# Images & Camera
npx expo install expo-image expo-camera

# Animations & Effects
npx expo install expo-linear-gradient expo-blur expo-haptics
npm install lottie-react-native

# Fonts
npx expo install @expo-google-fonts/poppins

# Supporting
npx expo install react-native-svg expo-web-browser
npm install date-fns lucide-react-native

# Build tools (global)
npm install -g eas-cli
npx expo install expo-updates
```

**Important:** Always use `npx expo install` for Expo-maintained packages (it resolves SDK-compatible versions automatically). Use `npm install` only for non-Expo community packages.

---

## Version Pinning Strategy

Pin Expo SDK-managed packages with `~` (patch updates only). Pin third-party packages with `^` (minor updates OK). The `npx expo install` command handles this automatically.

**Critical pins:**
- `tailwindcss@3.4.17` -- NativeWind v4 breaks with Tailwind v4
- `react-native-reanimated@~4.1.x` -- must match SDK 54 bundled version
- `nativewind@~4.2.0` -- minimum version for Reanimated v4 compat

---

## Shared Code Strategy (Web <-> Mobile)

The web app (Next.js) and mobile app (Expo) share:
- **Supabase types** -- generate once, share via a `shared/` package or copy
- **Design tokens** -- colors (#0B0B0F, #FF4D6A, etc.) defined in both tailwind configs
- **API contracts** -- same Supabase tables, same RLS policies
- **Business logic** -- tier calculations, badge rules can be extracted to shared utils

They do NOT share:
- **Components** -- React DOM vs React Native are different renderers
- **Routing** -- Next.js App Router vs Expo Router (similar patterns, different implementations)
- **Auth flow** -- Web uses cookies (@supabase/ssr), mobile uses MMKV + SecureStore
- **Styling** -- Tailwind v4 on web vs Tailwind v3.4 + NativeWind on mobile

Start as separate repos/directories. Extract shared logic into a `packages/shared` workspace only when duplication becomes painful (not upfront -- premature abstraction).

---

## Sources

- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) -- HIGH confidence
- [Expo SDK 55 Beta Changelog](https://expo.dev/changelog/sdk-55-beta) -- HIGH confidence
- [NativeWind v4 Installation Docs](https://www.nativewind.dev/docs/getting-started/installation) -- HIGH confidence
- [NativeWind v5 Migration Guide](https://www.nativewind.dev/v5/guides/migrate-from-v4) -- HIGH confidence
- [NativeWind Reanimated v4 Support Discussion](https://github.com/nativewind/nativewind/discussions/1529) -- MEDIUM confidence
- [Expo Location Docs](https://docs.expo.dev/versions/latest/sdk/location/) -- HIGH confidence
- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) -- HIGH confidence
- [Supabase Expo Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) -- HIGH confidence
- [Supabase Auth React Native Guide](https://supabase.com/docs/guides/auth/quickstarts/react-native) -- HIGH confidence
- [Expo SecureStore Docs](https://docs.expo.dev/versions/latest/sdk/securestore/) -- HIGH confidence
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/) -- HIGH confidence
- [Expo Updates Docs](https://docs.expo.dev/build/updates/) -- HIGH confidence
- [React Native Reanimated Compatibility Table](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/) -- HIGH confidence
- [Expo Image Docs](https://docs.expo.dev/versions/latest/sdk/image/) -- HIGH confidence
- [Expo Router Typed Routes](https://docs.expo.dev/router/reference/typed-routes/) -- HIGH confidence
- [React Native Tech Stack 2025](https://galaxies.dev/article/react-native-tech-stack-2025) -- MEDIUM confidence
- [Supabase + TanStack Query Guide](https://makerkit.dev/blog/saas/supabase-react-query) -- MEDIUM confidence
- [Expo OTA Best Practices](https://expo.dev/blog/5-ota-update-best-practices-every-mobile-team-should-know) -- HIGH confidence
- [react-native-maps Expo Docs](https://docs.expo.dev/versions/latest/sdk/map-view/) -- HIGH confidence
