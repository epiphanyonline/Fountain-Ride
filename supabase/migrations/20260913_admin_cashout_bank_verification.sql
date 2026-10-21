-- Fountain Ride cashout controls + verified Nigerian bank account foundation.
-- Safe additive migration. Run after 20260913_reviews_cashout_driver_growth.sql.

alter table public.driver_withdrawals
  add column if not exists account_verified_at timestamptz,
  add column if not exists verification_provider text,
  add column if not exists payout_reference text,
  add column if not exists admin_note text;

create index if not exists driver_withdrawals_cashout_queue_idx
  on public.driver_withdrawals(status, created_at desc);
