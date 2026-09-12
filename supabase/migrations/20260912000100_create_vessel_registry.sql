-- Create a canonical per-company vessel registry table.
-- This unifies the vessel-register and vessel-selector data model behind one source of truth.

create table if not exists public.vessel_registry (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,

  vessel_id text not null,
  vessel_name text not null,
  imo text,
  month_year_of_build text,
  yard_of_build text,
  flag text,
  class text,
  loa numeric,
  lbp numeric,
  breadth numeric,
  depth numeric,
  summer_draught numeric,
  dwt numeric,
  gt numeric,
  nt numeric,

  ga_plan_status text default 'Pending',
  midship_plan_status text default 'Pending',
  shell_exp_plan_status text default 'Pending',
  docking_plan_status text default 'Pending',
  pd_utm_status text default 'Pending',
  pd_blr_boro_status text default 'Pending',
  pd_ldm_status text default 'Pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vessel_registry_company_vessel_unique unique (company_id, vessel_id),
  constraint vessel_registry_company_imo_unique unique (company_id, imo)
);

create index if not exists idx_vessel_registry_company_id
  on public.vessel_registry (company_id);

create index if not exists idx_vessel_registry_company_imo
  on public.vessel_registry (company_id, imo);

create index if not exists idx_vessel_registry_company_name
  on public.vessel_registry (company_id, vessel_name);

create index if not exists idx_vessel_registry_updated_at
  on public.vessel_registry (updated_at desc);

alter table public.vessel_registry enable row level security;
alter table public.vessel_registry force row level security;

-- Lock the table down to service role for the secure desktop backend pattern.
-- The app can still fetch/update through Supabase Edge functions or a scoped API layer.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'vessel_registry'
  loop
    execute format('drop policy if exists %I on public.vessel_registry', p.policyname);
  end loop;
end;
$$;

revoke all on table public.vessel_registry from anon;
revoke all on table public.vessel_registry from authenticated;
grant select, insert, update, delete on table public.vessel_registry to service_role;

create or replace function public.set_vessel_registry_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_vessel_registry_updated_at
before update on public.vessel_registry
for each row
execute function public.set_vessel_registry_updated_at();
