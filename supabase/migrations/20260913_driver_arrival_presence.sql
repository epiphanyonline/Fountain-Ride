-- Fountain Ride pre-trip driver presence + low-cost arrival updates
-- Safe additive migration. Run after 20260913_mobile_garage_maps_wallet.sql.

alter table public.ride_requests add column if not exists driver_presence_status text;
alter table public.ride_requests add column if not exists driver_eta_minutes integer;
alter table public.ride_requests add column if not exists driver_presence_updated_at timestamptz;
alter table public.ride_requests add column if not exists driver_reconfirmed_at timestamptz;

do $$ begin
  alter table public.ride_requests add constraint ride_requests_driver_presence_status_check
  check (driver_presence_status is null or driver_presence_status in ('reconfirmed','preparing','on_my_way','30_min','10_min','approaching','arrived'));
exception when duplicate_object then null; end $$;

-- No public RLS policy is added. Updates continue through trusted server routes.
