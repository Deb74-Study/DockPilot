create table if not exists public.dd_job_matrix (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  matrix_key text not null default 'default',

  matrix_header jsonb not null default '[]'::jsonb,
  matrix_rows jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint dd_job_matrix_company_key_unique unique (company_id, matrix_key)
);

create index if not exists idx_dd_job_matrix_company_id
  on public.dd_job_matrix (company_id);

create index if not exists idx_dd_job_matrix_company_key
  on public.dd_job_matrix (company_id, matrix_key);

create index if not exists idx_dd_job_matrix_updated_at
  on public.dd_job_matrix (updated_at desc);

alter table public.dd_job_matrix enable row level security;
alter table public.dd_job_matrix force row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'dd_job_matrix'
  loop
    execute format('drop policy if exists %I on public.dd_job_matrix', p.policyname);
  end loop;
end;
$$;

revoke all on table public.dd_job_matrix from anon;
revoke all on table public.dd_job_matrix from authenticated;
grant select, insert, update, delete on table public.dd_job_matrix to service_role;

create or replace function public.set_dd_job_matrix_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_dd_job_matrix_updated_at
before update on public.dd_job_matrix
for each row
execute function public.set_dd_job_matrix_updated_at();
