-- Fountain Ride Mobile Garage + maps + negotiation upgrade
-- Safe additive migration. Run after 20260912_marketplace_secure_access.sql.

alter table public.ride_requests add column if not exists ride_type text not null default 'private';
alter table public.ride_requests add column if not exists commercial_mode text;
alter table public.ride_requests add column if not exists requested_park_id uuid references public.registered_parks(id) on delete set null;
alter table public.ride_requests add column if not exists requested_driver_application_id uuid references public.driver_applications(id) on delete set null;
alter table public.ride_requests add column if not exists pickup_lat double precision;
alter table public.ride_requests add column if not exists pickup_lng double precision;
alter table public.ride_requests add column if not exists dropoff_lat double precision;
alter table public.ride_requests add column if not exists dropoff_lng double precision;
alter table public.ride_requests add column if not exists estimated_distance_meters integer;
alter table public.ride_requests add column if not exists estimated_duration_seconds integer;

do $$ begin
  alter table public.ride_requests add constraint ride_requests_ride_type_check check (ride_type in ('private','commercial'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_requests add constraint ride_requests_commercial_mode_check check (commercial_mode is null or commercial_mode in ('quick_match','garage'));
exception when duplicate_object then null; end $$;

alter table public.registered_parks add column if not exists latitude double precision;
alter table public.registered_parks add column if not exists longitude double precision;
alter table public.registered_parks add column if not exists lga text;
alter table public.registered_parks add column if not exists description text;

alter table public.driver_applications add column if not exists is_available boolean not null default true;
alter table public.driver_applications add column if not exists current_lat double precision;
alter table public.driver_applications add column if not exists current_lng double precision;
alter table public.driver_applications add column if not exists last_location_at timestamptz;

alter table public.ride_offers add column if not exists counter_amount numeric(14,2);
alter table public.ride_offers add column if not exists last_actor text not null default 'driver';
alter table public.ride_offers add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.ride_offers add constraint ride_offers_last_actor_check check (last_actor in ('driver','rider'));
exception when duplicate_object then null; end $$;

alter table public.ride_messages add column if not exists target_driver_application_id uuid references public.driver_applications(id) on delete set null;

create table if not exists public.ride_driver_invites (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  driver_application_id uuid not null references public.driver_applications(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','viewed','offered','declined','closed','selected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ride_request_id, driver_application_id)
);

create table if not exists public.trip_locations (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  actor_role text not null check (actor_role in ('rider','driver')),
  driver_application_id uuid references public.driver_applications(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision,
  created_at timestamptz not null default now()
);

create index if not exists ride_requests_marketplace_idx on public.ride_requests(ride_type, commercial_mode, requested_park_id, pickup_state, status);
create index if not exists driver_applications_park_available_idx on public.driver_applications(park_id, verification_status, is_available);
create index if not exists ride_driver_invites_driver_idx on public.ride_driver_invites(driver_application_id, status, created_at desc);
create index if not exists trip_locations_ride_idx on public.trip_locations(ride_request_id, created_at desc);

alter table public.ride_driver_invites enable row level security;
alter table public.trip_locations enable row level security;

-- Bootstrap garages for already-approved commercial drivers that only supplied a park name.
insert into public.registered_parks (name,state,city,verification_status)
select distinct trim(d.park_name), d.home_state, d.home_city, 'verified'
from public.driver_applications d
where d.driver_type='commercial'
  and d.verification_status='approved'
  and d.park_id is null
  and nullif(trim(d.park_name),'') is not null
  and not exists (
    select 1 from public.registered_parks p
    where lower(trim(p.name))=lower(trim(d.park_name))
      and p.state=d.home_state
  );

update public.driver_applications d
set park_id=p.id
from public.registered_parks p
where d.driver_type='commercial'
  and d.park_id is null
  and nullif(trim(d.park_name),'') is not null
  and lower(trim(p.name))=lower(trim(d.park_name))
  and p.state=d.home_state;

-- RLS remains intentionally closed to public clients. Marketplace access is through server routes.
