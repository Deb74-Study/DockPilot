-- Harden access to raw credentials so browser clients cannot read or mutate rows directly.
do $$
declare
  p record;
begin
  if to_regclass('public.credentials') is null then
    raise notice 'public.credentials table does not exist in this project. Skipping RLS hardening migration.';
    return;
  end if;

  execute 'alter table public.credentials enable row level security';
  execute 'alter table public.credentials force row level security';

  -- Remove any existing permissive policies on credentials.
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'credentials'
  loop
    execute format('drop policy if exists %I on public.credentials', p.policyname);
  end loop;

  -- Remove direct table privileges from browser-facing roles.
  execute 'revoke all on table public.credentials from anon';
  execute 'revoke all on table public.credentials from authenticated';

  -- Ensure backend service role retains access for edge functions.
  execute 'grant select, insert, update, delete on table public.credentials to service_role';
end;
$$;
