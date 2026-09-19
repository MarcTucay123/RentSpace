-- Apartment assignments use the unit itself as the rentable space, so their
-- default monthly rate belongs on units rather than on a synthetic room.
alter table public.units
  add column if not exists rental_rate numeric(12,2);

alter table public.units
  drop constraint if exists units_rental_rate_nonnegative_chk;

alter table public.units
  add constraint units_rental_rate_nonnegative_chk
  check (rental_rate is null or rental_rate >= 0);

comment on column public.units.rental_rate is
  'Default monthly rental rate for whole-unit apartment assignments.';

notify pgrst, 'reload schema';