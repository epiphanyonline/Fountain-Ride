-- Fountain Ride verified reviews + driver cashout foundation.
-- Safe additive migration. Run after 20260913_driver_arrival_presence.sql.

alter table public.ride_reviews
  add column if not exists driver_application_id uuid references public.driver_applications(id) on delete set null,
  add column if not exists punctuality_rating integer,
  add column if not exists safety_rating integer,
  add column if not exists vehicle_rating integer,
  add column if not exists communication_rating integer,
  add column if not exists professionalism_rating integer,
  add column if not exists review_status text not null default 'published';

do $$ begin
  alter table public.ride_reviews add constraint ride_reviews_punctuality_check check (punctuality_rating is null or punctuality_rating between 1 and 5);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_reviews add constraint ride_reviews_safety_check check (safety_rating is null or safety_rating between 1 and 5);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_reviews add constraint ride_reviews_vehicle_check check (vehicle_rating is null or vehicle_rating between 1 and 5);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_reviews add constraint ride_reviews_communication_check check (communication_rating is null or communication_rating between 1 and 5);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_reviews add constraint ride_reviews_professionalism_check check (professionalism_rating is null or professionalism_rating between 1 and 5);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_reviews add constraint ride_reviews_status_check check (review_status in ('published','reported','hidden'));
exception when duplicate_object then null; end $$;

create unique index if not exists ride_reviews_one_driver_review_per_trip_idx
  on public.ride_reviews(ride_request_id, driver_application_id)
  where driver_application_id is not null;
create index if not exists ride_reviews_driver_public_idx
  on public.ride_reviews(driver_application_id, review_status, created_at desc);

alter table public.driver_withdrawals
  add column if not exists account_number text,
  add column if not exists bank_code text,
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists driver_withdrawals_application_status_idx
  on public.driver_withdrawals(driver_application_id, status, created_at desc);
