-- Fountain Ride marketplace platform commission: 10%
-- Applies 10% to existing marketplace drivers and makes 10% the default for new drivers.

alter table public.driver_applications
  alter column commission_rate set default 10;

update public.driver_applications
set commission_rate = 10
where commission_rate is distinct from 10;
