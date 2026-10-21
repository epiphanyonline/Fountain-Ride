-- Fountain Ride Marketplace secure access + driver linkage
-- Safe additive migration. Run after 20260911_fountain_ride_marketplace.sql.

alter table public.ride_requests
  add column if not exists rider_access_hash text;

alter table public.driver_applications
  add column if not exists driver_access_hash text;

alter table public.ride_offers
  add column if not exists driver_application_id uuid references public.driver_applications(id) on delete set null;

alter table public.ride_messages
  add column if not exists driver_application_id uuid references public.driver_applications(id) on delete set null;

alter table public.driver_earnings
  add column if not exists driver_application_id uuid references public.driver_applications(id) on delete set null;

alter table public.driver_withdrawals
  add column if not exists driver_application_id uuid references public.driver_applications(id) on delete set null;

create index if not exists ride_offers_driver_application_idx
  on public.ride_offers(driver_application_id, created_at desc);

create index if not exists driver_earnings_application_idx
  on public.driver_earnings(driver_application_id, status, created_at desc);

-- Prevent one driver application from flooding the same ride with multiple active rows.
create unique index if not exists ride_offers_one_driver_per_ride_idx
  on public.ride_offers(ride_request_id, driver_application_id)
  where driver_application_id is not null;

-- RLS remains enabled with no broad public policies. All marketplace access is through trusted server routes.
