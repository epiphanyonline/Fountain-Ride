-- Fountain Ride mobile-first driver authentication.
-- Run after 20260913_secure_driver_accounts_payout.sql.

alter table public.driver_applications
  add column if not exists phone_login_key text,
  add column if not exists login_pin_hash text,
  add column if not exists login_pin_set_at timestamptz,
  add column if not exists failed_login_attempts integer not null default 0,
  add column if not exists login_locked_until timestamptz,
  add column if not exists phone_verified_at timestamptz;

-- Normalize existing Nigerian mobile numbers for login without changing what is displayed.
update public.driver_applications
set phone_login_key = case
  when length(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')) = 13
       and regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g') like '234%'
    then '0' || substring(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g') from 4)
  when length(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')) = 10
    then '0' || regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')
  else regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')
end
where phone_login_key is null or phone_login_key = '';

create index if not exists driver_applications_phone_login_idx
  on public.driver_applications(phone_login_key);
create index if not exists driver_applications_login_lock_idx
  on public.driver_applications(login_locked_until)
  where login_locked_until is not null;
