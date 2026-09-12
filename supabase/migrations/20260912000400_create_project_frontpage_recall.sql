create table if not exists public.project_frontpage_recall (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_key text not null,

  launch_date text,
  vessel_id text,
  vessel_name text,
  imo text,
  docking_criteria text,
  cap_survey text,
  est_release_date text,

  loceta_1_label text,
  loceta_1_date text,
  loceta_2_label text,
  loceta_2_date text,
  loceta_3_label text,
  loceta_3_date text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint project_frontpage_recall_company_project_unique unique (company_id, project_key)
);

create index if not exists idx_project_frontpage_recall_company_id
  on public.project_frontpage_recall (company_id);

create index if not exists idx_project_frontpage_recall_project_key
  on public.project_frontpage_recall (company_id, project_key);

create index if not exists idx_project_frontpage_recall_updated_at
  on public.project_frontpage_recall (updated_at desc);

alter table public.project_frontpage_recall enable row level security;
alter table public.project_frontpage_recall force row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'project_frontpage_recall'
  loop
    execute format('drop policy if exists %I on public.project_frontpage_recall', p.policyname);
  end loop;
end;
$$;

revoke all on table public.project_frontpage_recall from anon;
revoke all on table public.project_frontpage_recall from authenticated;
grant select, insert, update, delete on table public.project_frontpage_recall to service_role;

create or replace function public.set_project_frontpage_recall_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_project_frontpage_recall_updated_at
before update on public.project_frontpage_recall
for each row
execute function public.set_project_frontpage_recall_updated_at();

create table if not exists public.project_frontpage_checkpoint_recall (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_key text not null,
  checkpoint_index integer not null,
  checkpoint_label text,
  checkpoint_date_iso text,
  locked boolean not null default false,
  roundel_green boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint project_frontpage_checkpoint_recall_company_project_checkpoint_unique unique (company_id, project_key, checkpoint_index)
);

create index if not exists idx_project_frontpage_checkpoint_recall_company_id
  on public.project_frontpage_checkpoint_recall (company_id);

create index if not exists idx_project_frontpage_checkpoint_recall_project_key
  on public.project_frontpage_checkpoint_recall (company_id, project_key);

create index if not exists idx_project_frontpage_checkpoint_recall_updated_at
  on public.project_frontpage_checkpoint_recall (updated_at desc);

alter table public.project_frontpage_checkpoint_recall enable row level security;
alter table public.project_frontpage_checkpoint_recall force row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'project_frontpage_checkpoint_recall'
  loop
    execute format('drop policy if exists %I on public.project_frontpage_checkpoint_recall', p.policyname);
  end loop;
end;
$$;

revoke all on table public.project_frontpage_checkpoint_recall from anon;
revoke all on table public.project_frontpage_checkpoint_recall from authenticated;
grant select, insert, update, delete on table public.project_frontpage_checkpoint_recall to service_role;

create or replace function public.set_project_frontpage_checkpoint_recall_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_project_frontpage_checkpoint_recall_updated_at
before update on public.project_frontpage_checkpoint_recall
for each row
execute function public.set_project_frontpage_checkpoint_recall_updated_at();
