-- Fountain Ride secure driver account, assisted activation and saved payout account foundation.
-- Safe additive migration. Run after 20260913_admin_cashout_bank_verification.sql.

alter table public.driver_applications
  add column if not exists account_status text not null default 'activated',
  add column if not exists activation_hash text,
  add column if not exists activation_expires_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists wallet_pin_hash text,
  add column if not exists wallet_pin_set_at timestamptz,
  add column if not exists email_verified_at timestamptz,
  add column if not exists account_security_updated_at timestamptz;

do $$ begin
  alter table public.driver_applications
    add constraint driver_applications_account_status_check
    check (account_status in ('pre_registered','activated','locked'));
exception when duplicate_object then null; end $$;

-- Preserve all existing working driver accounts as activated.
update public.driver_applications
set account_status = 'activated',
    activated_at = coalesce(activated_at, created_at)
where account_status is null or account_status = '';

create index if not exists driver_applications_account_status_idx
  on public.driver_applications(account_status, verification_status, created_at desc);

create table if not exists public.driver_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  driver_application_id uuid not null references public.driver_applications(id) on delete cascade,
  bank_name text not null,
  bank_code text not null,
  account_name text not null,
  account_number text not null,
  account_number_masked text not null,
  verification_provider text not null default 'paystack',
  verified_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','pending','replaced','disabled')),
  available_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.driver_payout_accounts enable row level security;

create unique index if not exists driver_payout_accounts_one_active_idx
  on public.driver_payout_accounts(driver_application_id)
  where status = 'active';
create unique index if not exists driver_payout_accounts_one_pending_idx
  on public.driver_payout_accounts(driver_application_id)
  where status = 'pending';
create index if not exists driver_payout_accounts_driver_idx
  on public.driver_payout_accounts(driver_application_id, status, created_at desc);

create table if not exists public.driver_security_events (
  id uuid primary key default gen_random_uuid(),
  driver_application_id uuid references public.driver_applications(id) on delete cascade,
  event_type text not null,
  actor_type text not null default 'driver',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.driver_security_events enable row level security;
create index if not exists driver_security_events_driver_idx
  on public.driver_security_events(driver_application_id, created_at desc);

-- Backfill each driver's most recently verified withdrawal bank account so existing
-- verified drivers do not have to repeat account lookup after this upgrade.
insert into public.driver_payout_accounts (
  driver_application_id, bank_name, bank_code, account_name, account_number,
  account_number_masked, verification_provider, verified_at, status, available_from
)
select distinct on (w.driver_application_id)
  w.driver_application_id,
  w.bank_name,
  w.bank_code,
  w.account_name,
  w.account_number,
  coalesce(w.account_number_masked, '••••' || right(w.account_number,4)),
  coalesce(w.verification_provider,'paystack'),
  coalesce(w.account_verified_at,w.created_at),
  'active',
  now()
from public.driver_withdrawals w
where w.driver_application_id is not null
  and w.account_verified_at is not null
  and nullif(w.bank_code,'') is not null
  and nullif(w.account_number,'') is not null
  and not exists (
    select 1 from public.driver_payout_accounts p
    where p.driver_application_id = w.driver_application_id
      and p.status = 'active'
  )
order by w.driver_application_id, w.account_verified_at desc nulls last, w.created_at desc;
