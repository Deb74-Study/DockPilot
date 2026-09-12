create table if not exists public.fleet_registration (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  matrix_key text not null default 'default',

  main_header text not null default 'Fleet Registration Matrix',
  sub_header_row_a jsonb not null default '[]'::jsonb,
  sub_header_row_b jsonb not null default '[]'::jsonb,
  row_labels jsonb not null default '[]'::jsonb,
  matrix_data jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fleet_registration_company_key_unique unique (company_id, matrix_key)
);

create index if not exists idx_fleet_registration_company_id
  on public.fleet_registration (company_id);

create index if not exists idx_fleet_registration_company_key
  on public.fleet_registration (company_id, matrix_key);

create index if not exists idx_fleet_registration_updated_at
  on public.fleet_registration (updated_at desc);

alter table public.fleet_registration enable row level security;
alter table public.fleet_registration force row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'fleet_registration'
  loop
    execute format('drop policy if exists %I on public.fleet_registration', p.policyname);
  end loop;
end;
$$;

revoke all on table public.fleet_registration from anon;
revoke all on table public.fleet_registration from authenticated;
grant select, insert, update, delete on table public.fleet_registration to service_role;

create or replace function public.set_fleet_registration_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_fleet_registration_updated_at
before update on public.fleet_registration
for each row
execute function public.set_fleet_registration_updated_at();
