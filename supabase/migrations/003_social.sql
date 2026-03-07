-- Fan follows (social graph)
-- NOTE: Run manually in Supabase SQL Editor (JS client can't run DDL)
create table if not exists fan_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references fans(id) on delete cascade not null,
  following_id uuid references fans(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

create index if not exists idx_fan_follows_follower on fan_follows(follower_id);
create index if not exists idx_fan_follows_following on fan_follows(following_id);

-- Prevent self-follows at DB level
alter table fan_follows add constraint no_self_follow check (follower_id != following_id);

-- Fan privacy settings
create table if not exists fan_privacy (
  fan_id uuid primary key references fans(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public', 'private', 'mutual')),
  updated_at timestamptz default now()
);
