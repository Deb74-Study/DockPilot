-- Add password-hash support for secure auth flows.

alter table if exists public.credentials
  add column if not exists password_hash text;
alter table if exists public.credentials
  alter column temp_password drop not null;
create index if not exists credentials_login_name_idx
  on public.credentials (login_name);
