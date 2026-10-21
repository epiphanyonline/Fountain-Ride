-- Fountain Ride database-backed rider accounts.
-- Additive migration. Existing browser-token rides continue to work.

create table if not exists public.rider_accounts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  phone_login_key text not null unique,
  email text,
  login_pin_hash text not null,
  session_hash text,
  account_status text not null default 'active'
    check (account_status in ('active','locked','suspended')),
  failed_login_attempts integer not null default 0,
  login_locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ride_requests
  add column if not exists rider_account_id uuid
  references public.rider_accounts(id) on delete set null;

create index if not exists rider_accounts_phone_login_idx
  on public.rider_accounts(phone_login_key);

create index if not exists rider_accounts_session_idx
  on public.rider_accounts(session_hash)
  where session_hash is not null;

create index if not exists ride_requests_rider_account_idx
  on public.ride_requests(rider_account_id, created_at desc);

alter table public.rider_accounts enable row level security;
-- No public policy. Rider account operations go through trusted server routes.
