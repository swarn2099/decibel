# Architecture Patterns

**Domain:** React Native Expo mobile app for Decibel (fan passport + performer platform)
**Researched:** 2026-03-08
**Confidence:** HIGH (Expo Router, Supabase RN, TanStack Query all have mature documentation)

## Recommended Architecture

### High-Level Overview

```
+-----------------------------------------------------+
|                   Expo Router                         |
|  (tabs)/ -- passport, explore, scan, activity, you   |
|  (auth)/ -- login, magic-link-callback               |
|  (modals)/ -- artist-detail, badge-detail, settings   |
+-----------------------------------------------------+
         |                    |                |
   Zustand Stores      TanStack Query     Supabase Client
   (UI state,          (server state,     (direct DB queries
    auth session,       caching,           via RLS + anon key)
    offline queue)      background sync)
         |                    |                |
         +--------------------+----------------+
                              |
                     Supabase Backend
              (PostgreSQL + Auth + Storage + Realtime)
                              |
              +---------------+---------------+
              |               |               |
          Auth (magic    Storage (avatars,  Edge Functions
          link + deep    performer photos)  (complex ops,
          link callback)                    Spotify proxy)
```

The mobile app is a **read-heavy client** that talks directly to Supabase for most reads and calls the existing Next.js web API routes for complex mutations. No new backend needed.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Expo Router (app/)** | Screen rendering, navigation, deep link handling | All layers below |
| **Auth Provider** | Session management, token refresh, protected route guards | Supabase Auth, Zustand auth store |
| **TanStack Query Layer** | Server state: fetching, caching, optimistic updates, background sync | Supabase client, Expo Router screens |
| **Zustand Stores** | Client-only state: UI preferences, offline queue, scan state | Screens, TanStack Query (for mutations) |
| **Supabase Client** | Database queries, auth operations, storage uploads, realtime subscriptions | Supabase backend directly |
| **API Service Layer** | Thin abstraction over Supabase queries, query key factories | TanStack Query hooks |
| **Push Notification Service** | Token registration, notification handling, deep link routing | Expo Notifications, Supabase (store token), Expo Router |
| **Location Service** | Geofencing, background location, venue proximity detection | expo-location, expo-task-manager, Supabase |
| **Shared Types** | TypeScript interfaces for DB entities, API responses | All layers |

## Data Flow

### Authentication Flow (Magic Link + Deep Link)

```
1. Fan enters email on Login screen
2. App calls supabase.auth.signInWithOtp({
     email,
     options: { emailRedirectTo: 'decibel://auth/callback' }
   })
3. Supabase sends magic link email
4. Fan taps link in email
5. OS opens app via deep link: decibel://auth/callback?token_hash=...&type=magiclink
6. Expo Router catches route at app/(auth)/callback.tsx
7. Screen calls supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
8. Session stored in SecureStore via custom storage adapter
9. Auth provider updates -> Zustand auth store -> protected routes unlock
10. TanStack Query refetches user-dependent queries (passport, collections, badges)
```

**Key difference from web app:** The web uses `@supabase/ssr` with cookies. The mobile app uses `@supabase/supabase-js` with `expo-secure-store` as the storage adapter. Same Supabase project, same auth system, different session persistence mechanism.

### Collection/Scan Flow

```
1. Fan opens Scan tab -> camera activates (expo-camera)
2. Scans QR code -> extracts performer slug from URL
3. App calls existing web API: POST https://decibel-three.vercel.app/api/collect
   with { email, performer_slug }
   (Reuses the SAME endpoint the web app uses -- no duplication)
4. On success: invalidate TanStack Query keys ['collections'], ['passport'], ['badges']
5. Optimistic update shows new collection immediately
6. Badge evaluation runs server-side (existing /api/badges/evaluate)
7. Push notification fires if new badge earned
```

### Passive Location Detection Flow

```
1. On first verified scan, prompt for background location permission
2. Register geofences for nearby venues via expo-location.startGeofencingAsync()
3. expo-task-manager fires background task on geofence enter
4. Task checks: is there an active event at this venue right now? (query events table)
5. If yes: send local notification "You're at [Venue] -- [Performer] is playing"
6. Fan taps notification -> deep link to confirm collection screen
7. Collection created with capture_method: 'location', verified: true
```

### Data Fetching Pattern (TanStack Query)

```
Screen mounts
  -> useQuery(queryKeys.passport.detail(fanId))
    -> api.passport.getFanPassport(fanId)
      -> supabase.from('collections')
           .select('*, performer:performers(*), venue:venues(*)')
           .eq('fan_id', fanId)
    -> Returns cached data immediately (staleTime: 5min)
    -> Background refetch if stale
  -> Screen renders from cache, updates when fresh data arrives
```

## Expo Router File Structure

```
app/
├── _layout.tsx                    # Root layout: providers (QueryClient, Auth, NativeWind)
├── (auth)/
│   ├── _layout.tsx                # Stack layout for auth screens
│   ├── login.tsx                  # Email input + magic link send
│   └── callback.tsx               # Deep link handler for magic link verification
├── (tabs)/
│   ├── _layout.tsx                # Tab bar: 5 tabs, Tabs.Protected for auth guard
│   ├── index.tsx                  # Passport (home tab) -- fan's collection + stats
│   ├── explore.tsx                # Discover performers, search, trending
│   ├── scan.tsx                   # QR scanner (camera) + NFC reader
│   ├── activity.tsx               # Activity feed, friend discoveries, badge unlocks
│   └── profile.tsx                # Settings, connected accounts, logout
├── artist/
│   └── [slug].tsx                 # Artist detail (presented as modal or stack push)
├── badge/
│   └── [id].tsx                   # Badge detail modal
├── passport/
│   └── [slug].tsx                 # Public passport view (shared link deep link target)
└── +not-found.tsx                 # 404 handler
```

### Layout Decisions

**Root `_layout.tsx`** wraps the entire app:
1. `QueryClientProvider` (TanStack Query)
2. `AuthProvider` (Supabase session listener + SecureStore)
3. NativeWind CSS interop (handled by babel preset)
4. `Stack` navigator containing `(auth)` and `(tabs)` groups

**Tab layout `(tabs)/_layout.tsx`** uses Expo Router SDK 53+ `Tabs.Protected`:
```typescript
<Tabs>
  <Tabs.Protected guard={isAuthenticated}>
    <Tabs.Screen name="index" options={{ title: 'Passport' }} />
    <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
    <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
    <Tabs.Screen name="profile" options={{ title: 'You' }} />
  </Tabs.Protected>
  {/* Explore available without auth */}
  <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
</Tabs>
```

When `isAuthenticated` is false, tapping a protected tab silently fails. The user sees only Explore until they log in.

## Patterns to Follow

### Pattern 1: Supabase Client with SecureStore

Unlike the web app which uses `@supabase/ssr` with cookies, mobile uses `@supabase/supabase-js` with a custom SecureStore adapter for encrypted session persistence.

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // handled manually via deep link
    },
  }
);
```

### Pattern 2: Query Key Factory

Centralized query keys for consistent cache invalidation across the app.

```typescript
// src/api/queryKeys.ts
export const queryKeys = {
  passport: {
    all: ['passport'] as const,
    detail: (fanId: string) => ['passport', fanId] as const,
    stats: (fanId: string) => ['passport', 'stats', fanId] as const,
  },
  collections: {
    all: ['collections'] as const,
    byFan: (fanId: string) => ['collections', fanId] as const,
  },
  performers: {
    all: ['performers'] as const,
    detail: (slug: string) => ['performers', slug] as const,
    search: (query: string) => ['performers', 'search', query] as const,
  },
  badges: {
    all: ['badges'] as const,
    byFan: (fanId: string) => ['badges', fanId] as const,
  },
  events: {
    all: ['events'] as const,
    upcoming: (city?: string) => ['events', 'upcoming', city] as const,
    byPerformer: (id: string) => ['events', 'performer', id] as const,
  },
  activity: {
    feed: (fanId: string) => ['activity', fanId] as const,
  },
};
```

### Pattern 3: TanStack Query Hooks per Domain

Each domain gets its own hooks file. Screens import hooks, never raw Supabase queries.

```typescript
// src/api/usePassport.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from './queryKeys';
import type { PassportFan, PassportTimelineEntry } from '@/types/passport';

export function usePassport(fanId: string) {
  return useQuery({
    queryKey: queryKeys.passport.detail(fanId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*, performer:performers(*), venue:venues(*)')
        .eq('fan_id', fanId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return transformPassportData(data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Pattern 4: Zustand Stores (Thin, Client-Only)

Zustand handles ONLY client-local state. Server state lives exclusively in TanStack Query.

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) => set({
    session,
    user: session?.user ?? null,
    isLoading: false,
  }),
}));
```

Other Zustand stores: `scanStore` (camera state, last scanned slug), `uiStore` (theme, onboarding completion).

### Pattern 5: Auth Provider with Supabase Listener

```typescript
// src/providers/AuthProvider.tsx
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { setSession(session); }
    );

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
```

## API Layer Decision: Direct Supabase vs Web API Routes

**Hybrid approach. Use direct Supabase for reads, web API routes for complex mutations.**

| Operation | Approach | Why |
|-----------|----------|-----|
| Read collections, performers, events, badges | **Direct Supabase** | RLS handles auth, lower latency, works offline via TanStack Query cache |
| Create collection (scan) | **Web API** `/api/collect` | Complex logic: tier progression, badge evaluation, duplicate check |
| Add artist / discover | **Web API** `/api/add-artist`, `/api/discover` | Link resolution, Spotify lookup, mainstream filter |
| Spotify operations | **Web API** `/api/spotify/*` | Requires server-side secrets (client_secret) |
| Upload avatar | **Direct Supabase Storage** | Simple upload, RLS on bucket handles auth |
| Push token registration | **Direct Supabase insert** | Simple insert into `push_tokens` table |
| Fan follows | **Direct Supabase** | Simple CRUD with RLS |
| Badge evaluation | **Web API** `/api/badges/evaluate` | Complex logic, already implemented |
| Search performers | **Direct Supabase** | Text search on performers table, no server logic needed |

**Rationale:** Don't duplicate business logic. The web app already has battle-tested API routes for complex operations (collect, add-artist, badges). The mobile app calls those over HTTPS. For simple CRUD, go direct to Supabase for speed and offline capability.

**Web API base URL:** `https://decibel-three.vercel.app` (production Vercel deployment).

## Shared Types Strategy

The existing web app has types in `src/lib/types/` -- `passport.ts`, `badges.ts`, `discovery.ts`, `social.ts`, `map.ts`. These are pure TypeScript interfaces with zero framework dependencies.

**Phase 1 approach (recommended):** Copy shared types into the mobile app's `src/types/` directory. The types are small (~150 lines total) and change infrequently. Keep them in sync manually.

**Phase 2+ optimization:** If both apps are in a monorepo, extract to `packages/types/`:

```
decibel/
├── apps/
│   ├── web/          # Current Next.js app
│   └── mobile/       # New Expo app
├── packages/
│   └── types/        # Shared TypeScript types
│       ├── passport.ts
│       ├── badges.ts
│       └── index.ts
└── package.json      # Workspace root
```

This monorepo refactor is not needed until types start diverging or the team grows.

## Mobile-Specific File Structure

```
decibel-mobile/
├── app/                           # Expo Router screens (see above)
├── src/
│   ├── api/                       # TanStack Query hooks + query keys
│   │   ├── queryKeys.ts
│   │   ├── usePassport.ts
│   │   ├── useCollections.ts
│   │   ├── usePerformers.ts
│   │   ├── useBadges.ts
│   │   ├── useEvents.ts
│   │   └── useActivity.ts
│   ├── components/                # Reusable UI components
│   │   ├── ui/                    # Atomic: Button, Card, Input, Badge
│   │   ├── passport/              # PassportHeader, Timeline, StatsGrid
│   │   ├── performer/             # PerformerCard, PerformerDetail
│   │   ├── scan/                  # QRScanner, ScanResult
│   │   └── activity/              # FeedItem, BadgeUnlock
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client with SecureStore
│   │   └── webApi.ts              # Fetch wrapper for web API routes
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   └── QueryProvider.tsx
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── scanStore.ts
│   │   └── uiStore.ts
│   ├── types/                     # Copied from web app
│   │   ├── passport.ts
│   │   ├── badges.ts
│   │   └── index.ts
│   └── constants/
│       ├── colors.ts              # Design tokens matching web
│       └── tiers.ts               # Tier definitions matching web
├── assets/                        # Fonts, images, icons
├── app.json                       # Expo config with scheme, plugins
├── babel.config.js                # NativeWind JSX import source
├── metro.config.js                # NativeWind metro wrapper
├── tailwind.config.js             # Matching web design tokens
├── nativewind-env.d.ts
├── tsconfig.json
└── package.json
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Putting Server State in Zustand
**What:** Storing fetched data (performers, collections) in Zustand stores.
**Why bad:** Lose TanStack Query's caching, background refetch, stale-while-revalidate, and cache invalidation. Rebuild all of that manually.
**Instead:** Zustand = UI state only. TanStack Query = all server data.

### Anti-Pattern 2: Building a Custom API Gateway
**What:** Creating a new Express/Hono server to proxy between mobile and Supabase.
**Why bad:** Adds latency, deployment complexity, and maintenance burden. Supabase's RLS + anon key is designed for direct client access.
**Instead:** Call Supabase directly for reads. Call existing Next.js API routes for complex mutations.

### Anti-Pattern 3: Cookie-Based Auth in Mobile
**What:** Trying to use `@supabase/ssr` or cookie-based sessions in React Native.
**Why bad:** React Native has no browser cookies. `@supabase/ssr` is specifically for server-rendering frameworks.
**Instead:** Use `@supabase/supabase-js` with `expo-secure-store` as the storage adapter.

### Anti-Pattern 4: Duplicating Business Logic
**What:** Re-implementing collection creation, badge evaluation, or artist resolution in the mobile app.
**Why bad:** Two sources of truth for critical business logic. Bugs fixed in one place won't be fixed in the other.
**Instead:** Call the web app's API routes over HTTPS. They already handle edge cases.

### Anti-Pattern 5: Overusing Geofence Regions
**What:** Registering hundreds of venue geofences at once.
**Why bad:** iOS limits to 20 simultaneous geofence regions. Android limits to 100. Exceeding silently drops older ones.
**Instead:** Register only nearby venues (within 25km). Update the active set when the user moves significantly.

### Anti-Pattern 6: Fetching in Every Screen Mount
**What:** No staleTime, causing re-fetch on every navigation back to a tab.
**Why bad:** Wastes bandwidth, flashes loading states, bad UX.
**Instead:** Set appropriate staleTime per query (5min for passport, 15min for performer details, 1min for activity feed). TanStack Query handles background refresh.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **API calls** | Direct Supabase, no issues | Direct Supabase, add connection pooling | Supabase scales, consider read replicas |
| **Push notifications** | Expo Push Service (free) | Expo Push Service (still fine) | FCM/APNs direct, batch via Edge Functions |
| **Location tracking** | Foreground geofencing | Background geofencing, nearby venues only | Server-side event matching, reduce client geofences |
| **Image caching** | expo-image built-in cache | expo-image + prefetch on scroll | CDN via Supabase Storage (already CDN-backed) |
| **Offline support** | TanStack Query in-memory cache | Persist query cache to AsyncStorage | Selective sync for recent data only |
| **Search** | Direct Supabase `ilike` | Supabase full-text search | External search (Algolia or Typesense) |

## Suggested Build Order (Dependencies)

```
Phase 1: Foundation (no dependencies)
  ├── Expo project init + NativeWind + Expo Router file structure
  ├── Supabase client with SecureStore adapter
  ├── Auth flow: magic link + deep link callback + session persistence
  ├── Auth provider + Zustand auth store
  └── Tab layout with Tabs.Protected guard

Phase 2: Core Screens (depends on Phase 1)
  ├── TanStack Query setup + QueryClientProvider + query key factories
  ├── Passport screen: read collections, stats, badges via direct Supabase
  ├── Explore screen: search performers, browse upcoming events
  └── Artist detail screen: performer profile, events, collect/discover CTAs

Phase 3: Scan + Collection (depends on Phase 1 + 2)
  ├── QR scanner via expo-camera
  ├── Collection creation: call web /api/collect
  ├── Badge evaluation trigger: call web /api/badges/evaluate
  └── Optimistic updates + cache invalidation on collection

Phase 4: Social + Activity (depends on Phase 2)
  ├── Activity feed screen
  ├── Follow system: direct Supabase queries
  ├── Supabase Realtime subscription for live feed updates
  └── Public passport sharing: deep link to passport/[slug]

Phase 5: Push Notifications (depends on Phase 1)
  ├── expo-notifications setup + FCM config
  ├── Push token registration: store in Supabase push_tokens table
  ├── Notification handling + deep link routing to relevant screen
  └── Server-side trigger: Supabase Edge Function sends on new badge/collection

Phase 6: Location Detection (depends on Phase 3)
  ├── expo-location foreground permission
  ├── Background location permission + expo-task-manager
  ├── Geofence registration for nearby venues
  └── Auto-collection on venue proximity with active event check
```

**Phase ordering rationale:**
- Auth must come first -- everything depends on knowing who the user is
- Passport and Explore are read-only, lowest risk, highest value for early testing
- Scan is the core product action but needs auth + display layer working
- Social layers on top of core collection data
- Push notifications are independent but need auth for token registration
- Location is most complex, most permission-sensitive, depends on collection flow end-to-end

## Sources

- [Expo Router Introduction](https://docs.expo.dev/router/introduction/)
- [Expo Router Protected Routes](https://docs.expo.dev/router/advanced/protected/)
- [Expo Router Authentication](https://docs.expo.dev/router/advanced/authentication/)
- [Simplifying Auth Flows with Protected Routes (Expo Blog)](https://expo.dev/blog/simplifying-auth-flows-with-protected-routes)
- [Expo App Folder Structure Best Practices](https://expo.dev/blog/expo-app-folder-structure-best-practices)
- [Supabase Auth with React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Supabase with Expo React Native](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
- [Using Supabase - Expo Docs](https://docs.expo.dev/guides/using-supabase/)
- [TanStack Query React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [NativeWind Installation](https://www.nativewind.dev/docs/getting-started/installation)
- [Tailwind CSS in Expo](https://docs.expo.dev/guides/tailwind/)
- [Expo Location SDK](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Expo Deep Linking](https://docs.expo.dev/linking/into-your-app/)
- [Expo Image](https://docs.expo.dev/versions/latest/sdk/image/)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
