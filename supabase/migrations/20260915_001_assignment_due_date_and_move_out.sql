-- Store the first agreed rent due date with each rental assignment.
-- Existing assignments remain valid and can be backfilled by the landlord later.
alter table public.tenant_assignments
  add column if not exists rent_due_date date;

alter table public.tenant_assignments
  drop constraint if exists tenant_assignments_rent_due_date_chk;

alter table public.tenant_assignments
  add constraint tenant_assignments_rent_due_date_chk
  check (rent_due_date is null or rent_due_date >= start_date);

comment on column public.tenant_assignments.rent_due_date is
  'First agreed rent due date for this assignment; later billing dates belong to rental_obligations.';

notify pgrst, 'reload schema';