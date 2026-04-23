-- Phase 2: Add companies (client registry) table and extend credentials with company_id
-- for tenant-scoped access management.
--
-- Changes:
--   1. Create public.companies with all D1-specified fields (required + optional + TBA slots).
--   2. Lock companies down to service_role only (same policy pattern as credentials).
--   3. Drop single-column unique constraint on credentials.login_name
--      (login_name will be unique per company, not globally).
--   4. Add company_id UUID FK to credentials with ON DELETE CASCADE.
--   5. Create compound unique index (company_id, login_name).
--   6. Create supporting indexes for FK joins and tenant-scoped queries.

-- ============================================================
-- 1. companies table
-- ============================================================
create table if not exists public.companies (
  id                   uuid        primary key default gen_random_uuid(),
  name                 text        not null,                 -- Client/Company/DOC Name (required)
  contact_admin_email  text        not null,                 -- Company Contact Admin Email ID (required)
  contact_name         text,                                 -- Contact Name (optional)
  contact_address      text,                                 -- Contact Address (optional)
  registration_no      text,                                 -- Client Registration No. (optional)
  phone                text,                                 -- Phone No. (optional)
  tba1                 text,                                 -- TBA1 (reserved field)
  tba2                 text,                                 -- TBA2 (reserved field)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Unique name per company to prevent accidental duplicates.
create unique index if not exists idx_companies_name
  on public.companies (name);

-- ============================================================
-- 2. RLS lockdown for companies (service_role only)
-- ============================================================
alter table public.companies enable row level security;
alter table public.companies force row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'companies'
  loop
    execute format('drop policy if exists %I on public.companies', p.policyname);
  end loop;
end;
$$;

revoke all on table public.companies from anon;
revoke all on table public.companies from authenticated;
grant select, insert, update, delete on table public.companies to service_role;

-- ============================================================
-- 3. Drop old global unique constraint on credentials.login_name
--    (replaced by the compound unique below)
-- ============================================================
do $$
begin
  -- The original migration used a column-level UNIQUE which generates a
  -- constraint named credentials_login_name_key by convention.
  if exists (
    select 1
    from   pg_constraint
    where  conrelid = 'public.credentials'::regclass
      and  conname  = 'credentials_login_name_key'
  ) then
    alter table public.credentials drop constraint credentials_login_name_key;
  end if;
end;
$$;

-- ============================================================
-- 4. Add company_id FK to credentials
--    Safe: credentials table is empty at this migration point (Phase 1 baseline = 0 rows).
-- ============================================================
alter table public.credentials
  add column if not exists company_id uuid
    not null
    references public.companies (id)
    on delete cascade;

-- ============================================================
-- 5. Compound unique: one login_name per company
-- ============================================================
create unique index if not exists idx_credentials_company_login
  on public.credentials (company_id, login_name);

-- ============================================================
-- 6. Supporting performance indexes
-- ============================================================
-- Fast FK joins and tenant-scoped list queries.
create index if not exists idx_credentials_company_id
  on public.credentials (company_id);

-- Covering index for the primary auth lookup path used by dockpilot-login.
create index if not exists idx_credentials_company_login_name
  on public.credentials (company_id, login_name);
