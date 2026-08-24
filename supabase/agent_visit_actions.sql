-- Agent visit actions for dashboard: mark arrived or postpone by a week.
create table if not exists public.agent_visit_actions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  visit_date date not null,
  status text not null check (status in ('done','postponed')),
  postponed_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (agent_id is not null or company_id is not null)
);

create unique index if not exists agent_visit_actions_agent_date_idx
  on public.agent_visit_actions(agent_id, visit_date)
  where agent_id is not null;

create unique index if not exists agent_visit_actions_company_date_idx
  on public.agent_visit_actions(company_id, visit_date)
  where company_id is not null;

create index if not exists agent_visit_actions_postponed_to_idx
  on public.agent_visit_actions(postponed_to);

alter table public.agent_visit_actions enable row level security;

drop policy if exists agent_visit_actions_read on public.agent_visit_actions;
create policy agent_visit_actions_read on public.agent_visit_actions
  for select to authenticated using (true);

drop policy if exists agent_visit_actions_write on public.agent_visit_actions;
create policy agent_visit_actions_write on public.agent_visit_actions
  for all to authenticated using (true) with check (true);
