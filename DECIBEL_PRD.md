# DECIBEL — Product Requirements Document
## For Claude Code Autonomous Build

**Read CLAUDE.md first for full product context, aesthetic guidelines, and tech stack decisions.**

---

## Build Phases

Execute these phases in order. Each phase has acceptance criteria that must pass before moving to the next. Do not skip phases. Do not over-build — ship the minimum for each phase, then move on.

---

## PHASE 0: Project Setup

### Goal
Set up a working Next.js + Supabase project with the Decibel brand foundation.

### Tasks
1. Initialize Next.js 15 with TypeScript, Tailwind, ESLint, App Router, src directory
   - If the directory has existing files (CLAUDE.md, .claude/, scripts/, etc.), create Next.js in a temp directory and merge files into the existing structure without overwriting
2. Install core dependencies:
   - `@supabase/supabase-js` `@supabase/ssr` — database
   - `qrcode` `@types/qrcode` — QR generation
   - `sharp` — image processing
   - `lucide-react` — icons
   - `playwright` `cheerio` — scraping pipeline
3. Configure Tailwind with Decibel brand colors as CSS variables:
   ```
   --bg: #0B0B0F
   --bg-card: #15151C
   --pink: #FF4D6A
   --purple: #9B6DFF
   --blue: #4D9AFF
   --teal: #00D4AA
   --yellow: #FFD700
   --gray: #8E8E9A
   --light-gray: #55556A
   ```
4. Install and configure Poppins font via `next/font/google`
5. Create base layout with dark background and Poppins as default font
6. Create a `/` landing page that says "DECIBEL" with the tagline "The more you show up, the more you get in." — styled with the brand aesthetic. This is a smoke test that the project builds and deploys.
7. Set up Supabase client in `src/lib/supabase.ts` (server and client configs)
8. Create `.env.local.example` with required env vars:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   SOUNDCLOUD_CLIENT_ID=
   ```
9. Push to GitHub

### Acceptance Criteria
- [ ] `npm run dev` starts without errors
- [ ] Landing page loads at localhost:3000 with Decibel branding (dark bg, Poppins, correct colors)
- [ ] Supabase client initializes without errors
- [ ] All files committed and pushed to GitHub

---

## PHASE 1: Database Schema

### Goal
Create the core database tables in Supabase.

### Tasks
Create a migration file at `supabase/migrations/001_initial_schema.sql` with these tables:

```sql
-- Performers
create table performers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  bio text,
  photo_url text,
  soundcloud_url text,
  mixcloud_url text,
  ra_url text,
  instagram_handle text,
  city text default 'Chicago',
  genres text[] default '{}',
  follower_count integer default 0,
  claimed boolean default false,
  claimed_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Fans
create table fans (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text,
  name text,
  city text,
  app_installed boolean default false,
  created_at timestamptz default now()
);

-- Venues
create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  address text,
  city text default 'Chicago',
  latitude double precision not null,
  longitude double precision not null,
  geofence_radius_meters integer default 100,
  capacity integer,
  created_at timestamptz default now()
);

-- Events
create table events (
  id uuid primary key default gen_random_uuid(),
  performer_id uuid references performers(id) on delete cascade,
  venue_id uuid references venues(id) on delete cascade,
  event_date date not null,
  start_time timestamptz,
  end_time timestamptz,
  is_live boolean default false,
  source text default 'manual', -- manual, ra, dice, scraped
  external_url text,
  created_at timestamptz default now()
);

-- Collections (the core join: fan collected performer at venue)
create table collections (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid references fans(id) on delete cascade,
  performer_id uuid references performers(id) on delete cascade,
  venue_id uuid references venues(id),
  event_date date,
  capture_method text not null default 'qr', -- qr, nfc, text, location, import
  verified boolean default true,
  created_at timestamptz default now(),
  unique(fan_id, performer_id, event_date) -- one collection per fan per performer per day
);

-- Fan Tiers (derived from collections, but cached for fast lookup)
create table fan_tiers (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid references fans(id) on delete cascade,
  performer_id uuid references performers(id) on delete cascade,
  scan_count integer default 1,
  current_tier text default 'network', -- network, early_access, secret, inner_circle
  last_scan_date timestamptz default now(),
  unique(fan_id, performer_id)
);

-- Messages (performer to fans)
create table messages (
  id uuid primary key default gen_random_uuid(),
  performer_id uuid references performers(id) on delete cascade,
  subject text,
  body text not null,
  target_tier text, -- null = all fans, or specific tier
  sent_at timestamptz default now(),
  recipient_count integer default 0,
  open_count integer default 0,
  click_count integer default 0
);

-- Scraped Profiles (raw data from scraping pipeline)
create table scraped_profiles (
  id uuid primary key default gen_random_uuid(),
  performer_id uuid references performers(id) on delete cascade,
  source text not null, -- soundcloud, mixcloud, ra, dice, instagram
  raw_data jsonb not null,
  scraped_at timestamptz default now()
);

-- Create indexes
create index idx_collections_fan on collections(fan_id);
create index idx_collections_performer on collections(performer_id);
create index idx_events_performer on events(performer_id);
create index idx_events_venue on events(venue_id);
create index idx_fan_tiers_performer on fan_tiers(performer_id);
create index idx_performers_city on performers(city);
create index idx_performers_slug on performers(slug);
create index idx_venues_city on venues(city);

-- Enable RLS
alter table performers enable row level security;
alter table fans enable row level security;
alter table venues enable row level security;
alter table events enable row level security;
alter table collections enable row level security;
alter table fan_tiers enable row level security;
alter table messages enable row level security;
alter table scraped_profiles enable row level security;

-- Public read policies for performers and venues
create policy "Public read performers" on performers for select using (true);
create policy "Public read venues" on venues for select using (true);
create policy "Public read events" on events for select using (true);
```

### Seed Data
Create `supabase/seed.sql` with Chicago venue data:
```sql
insert into venues (name, slug, address, city, latitude, longitude, geofence_radius_meters, capacity) values
('Smartbar', 'smartbar', '3730 N Clark St, Chicago, IL 60613', 'Chicago', 41.9497, -87.6588, 80, 300),
('Soundbar', 'soundbar', '226 W Ontario St, Chicago, IL 60654', 'Chicago', 41.8935, -87.6366, 80, 600),
('Spybar', 'spybar', '646 N Franklin St, Chicago, IL 60654', 'Chicago', 41.8936, -87.6356, 80, 250),
('309 N Morgan', '309-n-morgan', '309 N Morgan St, Chicago, IL 60607', 'Chicago', 41.8869, -87.6521, 100, 300),
('Primary', 'primary', '5765 W Grand Ave, Chicago, IL 60639', 'Chicago', 41.9175, -87.7700, 100, 200),
('Podlasie Club', 'podlasie', '2918 N Central Park Ave, Chicago, IL 60618', 'Chicago', 41.9345, -87.7167, 80, 150),
('Radius Chicago', 'radius', '640 W Cermak Rd, Chicago, IL 60616', 'Chicago', 41.8525, -87.6422, 150, 3500),
('Concord Music Hall', 'concord', '2047 N Milwaukee Ave, Chicago, IL 60647', 'Chicago', 41.9189, -87.6878, 100, 1100),
('The Mid', 'the-mid', '306 N Halsted St, Chicago, IL 60661', 'Chicago', 41.8871, -87.6471, 80, 500),
('Prysm', 'prysm', '1543 N Kingsbury St, Chicago, IL 60642', 'Chicago', 41.9094, -87.6533, 80, 1000);
```

### Acceptance Criteria
- [ ] Migration runs successfully against Supabase
- [ ] Seed data populates venues table
- [ ] Can query performers and venues from Next.js app

---

## PHASE 2: Fan Capture Page (QR/NFC First Touch)

### Goal
Build the mobile-optimized capture page that fans land on when they scan a QR code or tap NFC.

### Route: `/collect/[performer-slug]`

### Requirements
- Mobile-first, must load in under 2 seconds
- Dark background with performer's name, photo (if available), and a single CTA button
- Fan enters email (one field) and taps "Collect" — that's it
- After collection, show a confirmation: "You collected [Performer Name]. Scans: [X]" with the tier badge
- If fan has scanned before, show their current tier and updated scan count
- Generate a shareable image (OG meta tags) so when someone shares the URL it previews with the performer's branding
- Must work on mobile browsers without any app install
- No login required for fans — email is the identifier

### Technical
- Server component that fetches performer data by slug
- Client component for the email form
- Supabase insert into `collections` table, upsert into `fan_tiers`
- Tier calculation: 1 = network, 3+ = early_access, 5+ = secret, 10+ = inner_circle
- QR code generation: create endpoint `/api/qr/[performer-slug]` that returns a QR image pointing to the collect page

### Design
- Follow CLAUDE.md aesthetic strictly (dark bg, brand colors, Poppins)
- Performer's tier color on the confirmation screen (pink for new, purple for early_access, blue for secret, teal for inner_circle)
- The page should feel like opening a secret — not like a signup form
- Subtle animation on the "Collect" button and confirmation reveal

### Acceptance Criteria
- [ ] Fan can scan QR → lands on page → enters email → collected in under 10 seconds total
- [ ] Collection recorded in Supabase with correct performer, venue (if available), capture method
- [ ] Fan tier updates correctly (1st scan = network, 3rd = early_access, etc.)
- [ ] Repeat scan by same email shows updated tier, not duplicate collection
- [ ] Page passes Lighthouse mobile performance score > 85
- [ ] OG meta tags generate correct preview image

---

## PHASE 3: Performer Dashboard

### Goal
Build the dashboard where performers see their fans and send messages.

### Route: `/dashboard` (authenticated)

### Requirements
- Performer auth via Supabase magic link (email)
- Dashboard shows: total fan count, fans by tier, recent scans (last 30 days) with venue/date
- Chart: scans over time (last 90 days)
- Fan list: searchable, sortable by scan count, filterable by tier
- Message composer: select target tier (all fans, or specific tier), write subject + body, preview, send
- QR code download: performer can download their QR code as a PNG for printing
- "Go Live" button: marks performer as live at a venue (select from venue list or GPS auto-detect)

### Technical
- Supabase Auth with magic link
- Performer claims their pre-built profile by verifying email matches their known contact
- Real-time fan count via Supabase Realtime subscriptions
- Message sending via SendGrid (queue messages, track opens/clicks)
- QR generation as downloadable PNG at 300 DPI (print-ready)

### Design
- Same dark aesthetic as fan pages
- Stats as large number callouts (inspired by the pitch deck)
- Fan list as clean table with colored tier badges
- Message composer should feel like writing a text, not an email blast

### Acceptance Criteria
- [ ] Performer can sign in via magic link
- [ ] Dashboard loads with correct fan count, tier breakdown, recent scans
- [ ] Can compose and send a message to fans of a specific tier
- [ ] QR code downloads as print-ready PNG
- [ ] "Go Live" button updates performer's live status with venue

---

## PHASE 4: Scraper Pipeline

### Goal
Build automated scrapers that pre-populate performer profiles from public data.

### Scripts Location: `scripts/scrapers/`

### Scrapers to Build

1. **SoundCloud Scraper** (`scripts/scrapers/soundcloud.ts`)
   - Use SoundCloud API with client_id
   - Search for users by genre + city tags: "house chicago", "techno chicago", "deep house chicago"
   - For each DJ found: extract name, bio, avatar URL, follower count, top 5 mixes (title, play count, URL), genres
   - Store in `performers` table + `scraped_profiles` table (source: 'soundcloud')
   - Deduplicate by name similarity (fuzzy match)

2. **Resident Advisor Scraper** (`scripts/scrapers/ra.ts`)
   - Use Playwright to scrape RA event listings for Chicago venues
   - Navigate to each target venue's RA page, extract past event listings
   - For each event: extract date, performer names from lineup
   - For each performer: check if exists in DB, if not create new profile
   - Store gig history in `events` table (source: 'ra')
   - Store raw data in `scraped_profiles` (source: 'ra')

3. **DICE Scraper** (`scripts/scrapers/dice.ts`)
   - Use Playwright to scrape DICE Chicago events page
   - Extract past and upcoming events with performer names, venues, dates, ticket prices
   - Cross-reference performers against existing database
   - Store in `events` table (source: 'dice')

4. **Profile Enricher** (`scripts/scrapers/enrich.ts`)
   - For each performer in DB without a photo: try SoundCloud avatar, then Instagram profile pic
   - For each performer without genres: infer from SoundCloud tags or RA genre listings
   - For each performer without gig count: count events in events table

### Runner
Create `scripts/scrapers/run-all.ts` that executes all scrapers in sequence with logging and error handling. Should be runnable as: `npx tsx scripts/scrapers/run-all.ts`

### Acceptance Criteria
- [ ] SoundCloud scraper finds and stores 50+ Chicago DJs
- [ ] RA scraper extracts event history from at least 5 target venues
- [ ] DICE scraper extracts upcoming and past Chicago events
- [ ] Performers table has 100+ profiles with names, at least some with photos and bios
- [ ] Events table has gig history linking performers to venues and dates
- [ ] No duplicate performers (fuzzy name matching works)
- [ ] Full pipeline runs in under 10 minutes

---

## PHASE 5: Instagram Content Generator

### Goal
Build an automated system that generates Instagram-ready images and captions.

### Scripts Location: `scripts/content/`

### Content Types

1. **DJ Spotlight** (`scripts/content/spotlight.ts`)
   - Input: performer slug
   - Output: 1080x1080 PNG image + caption text file
   - Image: Dark branded card with performer photo, name, stats (fan count, gig count, venues played), top genres. Decibel branding subtle in corner.
   - Caption: "[Performer Name] has played [X] sets across [Y] Chicago venues. [Top genres]. Tap the link to collect them. #decibel #chicagohouse #undergroundmusic"
   - Tags the performer's Instagram handle if available

2. **Scene Roundup** (`scripts/content/roundup.ts`)
   - Input: date range (default: last 7 days)
   - Output: 1080x1080 PNG image + caption text file
   - Image: Dark branded card showing "THIS WEEK IN CHICAGO" with list of events/performers/venues from the scraped data
   - Caption: City stats, upcoming highlights, #decibel branding

3. **Product Teaser** (`scripts/content/teaser.ts`)
   - Input: feature name (passport, dashboard, wrapped, tiers)
   - Output: 1080x1080 PNG mockup + caption text file
   - Image: Phone mockup showing the feature UI, styled with Decibel brand
   - Caption: Teaser copy building anticipation

### Technical Approach
- Build each content type as a React component in `src/components/content/`
- Use Playwright to render the component at 1080x1080 and screenshot to PNG
- Save output to `content/output/[date]-[type]-[slug].png` and `.txt` (caption)

### Batch Generator
Create `scripts/content/generate-week.ts` that generates 5-7 posts for the week:
- 2-3 DJ spotlights (random selection from DB, prioritize performers with rich data)
- 1 scene roundup
- 1-2 product teasers

### Acceptance Criteria
- [ ] DJ spotlight generates a branded 1080x1080 image with performer data
- [ ] Scene roundup generates a weekly recap image from scraped event data
- [ ] Product teaser generates a phone mockup image
- [ ] Weekly batch generates 5-7 posts with images and captions
- [ ] All images follow the Decibel dark aesthetic (not generic, not AI slop)
- [ ] Captions include relevant hashtags and performer tags

---

## PHASE 6: Outreach Agent

### Goal
Build a system that generates personalized outreach messages for performers.

### Scripts Location: `scripts/outreach/`

### Tasks

1. **Target Selection** (`scripts/outreach/select-targets.ts`)
   - Query performers table for unclaimed profiles with: 3+ gigs in last 6 months, has SoundCloud or Instagram
   - Rank by: gig frequency, follower count, profile completeness
   - Output: list of 10 performers to outreach this week

2. **Message Generator** (`scripts/outreach/generate-messages.ts`)
   - For each target performer, generate a personalized Instagram DM draft
   - Use their scraped data: mention specific venues they've played, their SoundCloud stats, recent gigs
   - Tone: casual, underground, not salesy. Like a scene insider reaching out, not a startup pitching.
   - Include a screenshot of their pre-built Decibel profile
   - Output: `content/output/outreach/[performer-slug]-dm.txt` and `[performer-slug]-profile-screenshot.png`

3. **Follow-Up Generator** (`scripts/outreach/generate-followups.ts`)
   - For performers who haven't responded after 3 days: generate follow-up message
   - Different angle than initial outreach
   - For performers who haven't responded after 7 days: generate final touch with profile screenshot attached

### Acceptance Criteria
- [ ] Selects 10 high-quality targets per week based on scraped data
- [ ] Generates personalized DMs that reference specific performer data (not templates)
- [ ] Generates profile screenshots showing the pre-built Decibel profile
- [ ] Follow-up messages have different angles than initial outreach
- [ ] All messages saved to output folder for human review before sending

---

## Build Order Summary

| Phase | What | Timeline | Depends On |
|-------|------|----------|------------|
| 0 | Project setup, landing page | Day 1 | Nothing |
| 1 | Database schema + seed data | Day 1-2 | Phase 0 |
| 2 | Fan capture page (QR scan) | Day 2-4 | Phase 1 |
| 3 | Performer dashboard | Day 4-7 | Phase 1, Phase 2 |
| 4 | Scraper pipeline | Day 3-6 (parallel) | Phase 1 |
| 5 | Content generator | Day 7-9 | Phase 4 |
| 6 | Outreach agent | Day 9-11 | Phase 4, Phase 5 |

**Phase 4 can run in parallel with Phases 2 and 3 since it's independent scripts.**

Total estimated build time: 10-14 days with Claude Code.
