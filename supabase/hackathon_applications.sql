-- AI Venture Night landing page (/hackathon): applications and contact leads.
-- Run once in Supabase SQL Editor. Visitors (anon) can only insert; reading is limited to signed-in users.
create table if not exists public.hackathon_applications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('application','lead')),
  track text check (track in ('tech','problem','pro')),
  name text not null check (char_length(name) between 1 and 200),
  phone text not null check (char_length(phone) between 7 and 40),
  email text not null check (char_length(email) between 3 and 320),
  occupation text check (char_length(occupation) <= 200),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (kind = 'lead' or track is not null)
);

create index if not exists hackathon_applications_created_idx on public.hackathon_applications(created_at desc);
create index if not exists hackathon_applications_track_idx on public.hackathon_applications(track);

alter table public.hackathon_applications enable row level security;

grant insert on public.hackathon_applications to anon;

drop policy if exists hackathon_applications_insert on public.hackathon_applications;
create policy hackathon_applications_insert on public.hackathon_applications
  for insert to anon, authenticated
  with check (octet_length(details::text) < 8000);

drop policy if exists hackathon_applications_read on public.hackathon_applications;
create policy hackathon_applications_read on public.hackathon_applications
  for select to authenticated using (true);
