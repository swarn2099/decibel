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
  source text default 'manual',
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
  capture_method text not null default 'qr',
  verified boolean default true,
  created_at timestamptz default now(),
  unique(fan_id, performer_id, event_date)
);

-- Fan Tiers (derived from collections, but cached for fast lookup)
create table fan_tiers (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid references fans(id) on delete cascade,
  performer_id uuid references performers(id) on delete cascade,
  scan_count integer default 1,
  current_tier text default 'network',
  last_scan_date timestamptz default now(),
  unique(fan_id, performer_id)
);

-- Messages (performer to fans)
create table messages (
  id uuid primary key default gen_random_uuid(),
  performer_id uuid references performers(id) on delete cascade,
  subject text,
  body text not null,
  target_tier text,
  sent_at timestamptz default now(),
  recipient_count integer default 0,
  open_count integer default 0,
  click_count integer default 0
);

-- Scraped Profiles (raw data from scraping pipeline)
create table scraped_profiles (
  id uuid primary key default gen_random_uuid(),
  performer_id uuid references performers(id) on delete cascade,
  source text not null,
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
