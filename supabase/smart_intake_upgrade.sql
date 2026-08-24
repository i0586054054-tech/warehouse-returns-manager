-- Smart intake upgrade. Run once in Supabase SQL Editor after the base schema.
create table if not exists public.companies(
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 return_method text not null default 'whatsapp' check(return_method in('whatsapp','agent','none')),
 agent_day int check(agent_day between 0 and 6),
 shipping_day int check(shipping_day between 0 and 6),
 returns_policy text,
 special_instructions text,
 phone text,
 whatsapp text,
 created_at timestamptz not null default now()
);
create table if not exists public.storage_locations(
 id uuid primary key default gen_random_uuid(),
 company_id uuid references public.companies(id) on delete cascade,
 shelf text not null,
 box_name text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.product_catalog(
 id uuid primary key default gen_random_uuid(),
 item_code text,
 barcode text,
 product_name text not null,
 supplier_name text,
 created_at timestamptz not null default now()
);
create unique index if not exists product_catalog_item_code_idx on public.product_catalog(item_code) where item_code is not null;
create index if not exists product_catalog_barcode_idx on public.product_catalog(barcode);
alter table public.agents add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.products add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.products add column if not exists shelf text;
alter table public.products add column if not exists box_name text;
alter table public.companies enable row level security;
alter table public.storage_locations enable row level security;
alter table public.product_catalog enable row level security;
drop policy if exists companies_read on public.companies; create policy companies_read on public.companies for select to authenticated using(true);
drop policy if exists companies_write on public.companies; create policy companies_write on public.companies for all to authenticated using(true) with check(true);
drop policy if exists locations_read on public.storage_locations; create policy locations_read on public.storage_locations for select to authenticated using(true);
drop policy if exists locations_write on public.storage_locations; create policy locations_write on public.storage_locations for all to authenticated using(true) with check(true);
drop policy if exists catalog_read on public.product_catalog; create policy catalog_read on public.product_catalog for select to authenticated using(true);
drop policy if exists catalog_write on public.product_catalog; create policy catalog_write on public.product_catalog for all to authenticated using(true) with check(true);
