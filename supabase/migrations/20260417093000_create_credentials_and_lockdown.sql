-- Option B foundation: create credentials table in this project and lock it down.

create extension if not exists pgcrypto;
create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  login_name text not null unique,
  full_name text not null,
  email text,
  role text not null default 'Developer',
  temp_password text not null,
  must_change_password boolean not null default true,
  password_updated_at timestamptz,
  expiry date not null,
  access_groups text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.credentials enable row level security;
alter table public.credentials force row level security;
-- Remove existing policies to avoid accidental browser access.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'credentials'
  loop
    execute format('drop policy if exists %I on public.credentials', p.policyname);
  end loop;
end;
$$;
-- Explicitly revoke browser-facing role privileges.
revoke all on table public.credentials from anon;
revoke all on table public.credentials from authenticated;
-- Keep backend service role access for edge functions/admin operations.
grant select, insert, update, delete on table public.credentials to service_role;
