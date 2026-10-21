-- Fountain Ride Payment Protection: rider start PIN, protected completion and refund/dispute evidence.
alter table public.ride_requests drop constraint if exists ride_requests_status_check;
alter table public.ride_requests add constraint ride_requests_status_check check (status in (
  'requested','negotiating','fare_agreed','awaiting_payment','confirmed','driver_en_route','driver_arrived','in_progress',
  'awaiting_rider_confirmation','completed','cancelled_by_rider','cancelled_by_driver','expired','disputed','refunded'
));

alter table public.ride_requests add column if not exists trip_start_pin text;
alter table public.ride_requests add column if not exists trip_started_at timestamptz;
alter table public.ride_requests add column if not exists driver_completed_at timestamptz;
alter table public.ride_requests add column if not exists rider_confirmed_at timestamptz;
alter table public.ride_requests add column if not exists protection_release_at timestamptz;
alter table public.ride_requests add column if not exists refund_requested_at timestamptz;
alter table public.ride_requests add column if not exists refund_reason text;
