-- Fountain Ride Marketplace V1
-- SAFE ADDITIVE MIGRATION
-- Existing cars, bookings, customers and owner records remain intact.

create extension if not exists pgcrypto;

create table if not exists public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  booking_ref text unique not null,
  rider_id uuid references auth.users(id) on delete set null,
  rider_name text not null,
  rider_phone text not null,
  rider_email text,
  rider_verified boolean not null default false,
  pickup_address text not null,
  pickup_state text not null,
  dropoff_address text not null,
  dropoff_state text not null,
  pickup_date date not null,
  pickup_time time not null,
  passenger_count integer not null default 1 check (passenger_count > 0),
  vehicle_preference text,
  notes text,
  booking_for_other boolean not null default false,
  status text not null default 'requested' check (status in ('requested','negotiating','fare_agreed','awaiting_payment','confirmed','driver_en_route','driver_arrived','in_progress','completed','cancelled_by_rider','cancelled_by_driver','expired','disputed','refunded')),
  agreed_fare numeric(14,2),
  accepted_offer_id uuid,
  trip_pin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registered_parks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null,
  city text,
  address text,
  contact_phone text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.driver_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text,
  driver_type text not null check (driver_type in ('private','commercial')),
  park_id uuid references public.registered_parks(id),
  park_name text,
  home_state text not null,
  home_city text,
  vehicle_make text not null,
  vehicle_model text not null,
  vehicle_year integer,
  vehicle_plate text not null,
  accept_unverified_riders boolean not null default true,
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected','suspended')),
  commission_rate numeric(5,2) not null default 15 check (commission_rate >= 0 and commission_rate <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_driver_requires_park check (
    driver_type = 'private' or park_id is not null or nullif(trim(park_name), '') is not null
  )
);

create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_application_id uuid not null references public.driver_applications(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  expires_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.ride_offers (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  driver_id uuid references auth.users(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'offered' check (status in ('offered','countered','accepted','declined','closed','expired')),
  created_at timestamptz not null default now()
);

alter table public.ride_requests drop constraint if exists ride_requests_accepted_offer_id_fkey;
alter table public.ride_requests add constraint ride_requests_accepted_offer_id_fkey foreign key (accepted_offer_id) references public.ride_offers(id) on delete set null;

create table if not exists public.ride_messages (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null,
  body text not null check (length(body) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.trip_events (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_payments (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id),
  provider text,
  provider_reference text unique,
  gross_amount numeric(14,2) not null check (gross_amount >= 0),
  platform_fee numeric(14,2) not null default 0 check (platform_fee >= 0),
  driver_net numeric(14,2) not null default 0 check (driver_net >= 0),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','partially_refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.driver_earnings (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references auth.users(id) on delete set null,
  ride_request_id uuid references public.ride_requests(id),
  gross_amount numeric(14,2) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  net_amount numeric(14,2) not null,
  entry_type text not null default 'trip_earning' check (entry_type in ('trip_earning','withdrawal','refund_adjustment','manual_adjustment')),
  status text not null default 'pending' check (status in ('pending','available','withdrawn','reversed')),
  created_at timestamptz not null default now(),
  available_at timestamptz
);

create table if not exists public.driver_withdrawals (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references auth.users(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  bank_name text,
  account_name text,
  account_number_masked text,
  provider_reference text,
  status text not null default 'requested' check (status in ('requested','processing','paid','failed','rejected')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.ride_reviews (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewee_id uuid references auth.users(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (ride_request_id, reviewer_id)
);

create table if not exists public.ride_disputes (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id),
  opened_by uuid references auth.users(id) on delete set null,
  category text not null,
  description text not null,
  status text not null default 'open' check (status in ('open','investigating','resolved','closed')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists ride_requests_route_idx on public.ride_requests(pickup_state, dropoff_state, pickup_date, status);
create index if not exists ride_requests_rider_idx on public.ride_requests(rider_id, created_at desc);
create index if not exists ride_offers_request_idx on public.ride_offers(ride_request_id, created_at);
create index if not exists ride_offers_driver_idx on public.ride_offers(driver_id, created_at desc);
create index if not exists ride_messages_request_idx on public.ride_messages(ride_request_id, created_at);
create index if not exists driver_applications_state_idx on public.driver_applications(home_state, verification_status);
create index if not exists driver_earnings_driver_idx on public.driver_earnings(driver_id, status, created_at desc);

do $$ begin alter publication supabase_realtime add table public.ride_messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.ride_offers; exception when duplicate_object then null; end $$;

alter table public.ride_requests enable row level security;
alter table public.registered_parks enable row level security;
alter table public.driver_applications enable row level security;
alter table public.driver_documents enable row level security;
alter table public.ride_offers enable row level security;
alter table public.ride_messages enable row level security;
alter table public.trip_events enable row level security;
alter table public.marketplace_payments enable row level security;
alter table public.driver_earnings enable row level security;
alter table public.driver_withdrawals enable row level security;
alter table public.ride_reviews enable row level security;
alter table public.ride_disputes enable row level security;

-- Deliberately no permissive public policies.
-- Sensitive marketplace actions must go through trusted server routes or authenticated ownership policies.
