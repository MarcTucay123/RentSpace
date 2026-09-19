-- Preserve each paid billing period and automatically create the next month's
-- unpaid obligation. The assignment's original due-day remains the anchor;
-- shorter months use their final valid day.
create unique index if not exists rental_obligations_assignment_due_date_unique_idx
on public.rental_obligations (tenant_assignment_id, due_date);

create or replace function public.create_next_monthly_rental_obligation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_record record;
  next_month_start date;
  next_month_end date;
  next_due_date date;
  due_day integer;
begin
  if old.payment_status <> 'paid' and new.payment_status <> 'paid' then
    return new;
  end if;

  select ta.status, ta.rent_due_date
  into assignment_record
  from public.tenant_assignments ta
  where ta.id = new.tenant_assignment_id;

  if assignment_record.status is distinct from 'active' then
    return new;
  end if;

  next_month_start := date_trunc('month', new.due_date)::date + interval '1 month';
  next_month_end := (next_month_start + interval '1 month - 1 day')::date;
  due_day := extract(day from coalesce(assignment_record.rent_due_date, new.due_date))::integer;
  next_due_date := next_month_start + (least(due_day, extract(day from next_month_end)::integer) - 1);

  if old.payment_status = 'paid' and new.payment_status <> 'paid' then
    delete from public.rental_obligations next_obligation
    where next_obligation.tenant_assignment_id = new.tenant_assignment_id
      and next_obligation.due_date = next_due_date
      and next_obligation.payment_status = 'unpaid'
      and next_obligation.amount_paid = 0
      and not exists (
        select 1
        from public.payments payment
        where payment.rental_obligation_id = next_obligation.id
      );

    return new;
  end if;

  insert into public.rental_obligations (
    tenant_assignment_id,
    period_start,
    period_end,
    due_date,
    amount_due,
    amount_paid,
    due_status,
    payment_status
  ) values (
    new.tenant_assignment_id,
    new.period_end + 1,
    (new.period_end + 1 + interval '1 month - 1 day')::date,
    next_due_date,
    new.amount_due,
    0,
    case
      when next_due_date < current_date then 'overdue'::public.due_status
      when next_due_date = current_date then 'due_today'::public.due_status
      when next_due_date <= current_date + 31 then 'due_soon'::public.due_status
      else 'upcoming'::public.due_status
    end,
    'unpaid'
  )
  on conflict (tenant_assignment_id, due_date) do nothing;

  return new;
end;
$$;

revoke all on function public.create_next_monthly_rental_obligation() from public;
revoke all on function public.create_next_monthly_rental_obligation() from anon, authenticated;

drop trigger if exists trg_create_next_monthly_rental_obligation on public.rental_obligations;
create trigger trg_create_next_monthly_rental_obligation
after update of payment_status on public.rental_obligations
for each row
when (old.payment_status is distinct from new.payment_status)
execute function public.create_next_monthly_rental_obligation();

-- Backfill one next period for active assignments whose latest obligation was
-- already paid before this trigger was installed.
with latest_obligations as (
  select distinct on (ro.tenant_assignment_id)
    ro.tenant_assignment_id,
    ro.period_end,
    ro.due_date,
    ro.amount_due,
    ro.payment_status,
    ta.rent_due_date
  from public.rental_obligations ro
  join public.tenant_assignments ta on ta.id = ro.tenant_assignment_id
  where ta.status = 'active'
  order by ro.tenant_assignment_id, ro.due_date desc
), rollover_dates as (
  select
    latest.*,
    (date_trunc('month', latest.due_date) + interval '1 month')::date as next_month_start,
    (date_trunc('month', latest.due_date) + interval '2 months - 1 day')::date as next_month_end
  from latest_obligations latest
  where latest.payment_status = 'paid'
)
insert into public.rental_obligations (
  tenant_assignment_id,
  period_start,
  period_end,
  due_date,
  amount_due,
  amount_paid,
  due_status,
  payment_status
)
select
  rollover.tenant_assignment_id,
  rollover.period_end + 1,
  (rollover.period_end + 1 + interval '1 month - 1 day')::date,
  rollover.next_month_start
    + (least(
        extract(day from coalesce(rollover.rent_due_date, rollover.due_date))::integer,
        extract(day from rollover.next_month_end)::integer
      ) - 1),
  rollover.amount_due,
  0,
  case
    when rollover.next_month_start
      + (least(extract(day from coalesce(rollover.rent_due_date, rollover.due_date))::integer, extract(day from rollover.next_month_end)::integer) - 1) < current_date
      then 'overdue'::public.due_status
    when rollover.next_month_start
      + (least(extract(day from coalesce(rollover.rent_due_date, rollover.due_date))::integer, extract(day from rollover.next_month_end)::integer) - 1) = current_date
      then 'due_today'::public.due_status
    when rollover.next_month_start
      + (least(extract(day from coalesce(rollover.rent_due_date, rollover.due_date))::integer, extract(day from rollover.next_month_end)::integer) - 1) <= current_date + 31
      then 'due_soon'::public.due_status
    else 'upcoming'::public.due_status
  end,
  'unpaid'
from rollover_dates rollover
on conflict (tenant_assignment_id, due_date) do nothing;

notify pgrst, 'reload schema';