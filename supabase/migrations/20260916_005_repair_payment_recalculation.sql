-- Restore the payment aggregate trigger in hosted projects and repair existing
-- obligations from their verified, pending, and rejected payment records.
create or replace function public.recalculate_rental_obligation_payment_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_obligation_id uuid;
  verified_total numeric(12,2);
  pending_exists boolean;
  rejected_exists boolean;
  obligation_amount_due numeric(12,2);
begin
  target_obligation_id := case when tg_op = 'DELETE' then old.rental_obligation_id else new.rental_obligation_id end;

  select coalesce(sum(p.amount), 0)
  into verified_total
  from public.payments p
  where p.rental_obligation_id = target_obligation_id
    and p.verification_status = 'verified';

  select exists (
    select 1 from public.payments p
    where p.rental_obligation_id = target_obligation_id
      and p.verification_status = 'pending'
  ) into pending_exists;

  select exists (
    select 1 from public.payments p
    where p.rental_obligation_id = target_obligation_id
      and p.verification_status = 'rejected'
  ) into rejected_exists;

  select ro.amount_due
  into obligation_amount_due
  from public.rental_obligations ro
  where ro.id = target_obligation_id
  for update;

  if obligation_amount_due is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  update public.rental_obligations
  set amount_paid = verified_total,
      payment_status = case
        when verified_total >= obligation_amount_due then 'paid'::public.payment_status
        when verified_total > 0 then 'partially_paid'::public.payment_status
        when pending_exists then 'pending_verification'::public.payment_status
        when rejected_exists then 'rejected'::public.payment_status
        else 'unpaid'::public.payment_status
      end,
      due_status = case
        when verified_total >= obligation_amount_due then 'upcoming'::public.due_status
        when due_date < current_date then 'overdue'::public.due_status
        when due_date = current_date then 'due_today'::public.due_status
        when due_date <= current_date + 31 then 'due_soon'::public.due_status
        else 'upcoming'::public.due_status
      end,
      updated_at = timezone('utc', now())
  where id = target_obligation_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.recalculate_rental_obligation_payment_status() from public;
revoke all on function public.recalculate_rental_obligation_payment_status() from anon, authenticated;

drop trigger if exists trg_recalculate_rental_obligation_payment_status on public.payments;
create trigger trg_recalculate_rental_obligation_payment_status
after insert or update or delete on public.payments
for each row execute function public.recalculate_rental_obligation_payment_status();

-- Recompute current data. Changes from unpaid to paid also invoke the monthly
-- rollover trigger installed by migration 20260916_002.
with payment_totals as (
  select
    ro.id,
    ro.amount_due,
    coalesce(sum(p.amount) filter (where p.verification_status = 'verified'), 0) as verified_total,
    coalesce(bool_or(p.verification_status = 'pending'), false) as pending_exists,
    coalesce(bool_or(p.verification_status = 'rejected'), false) as rejected_exists
  from public.rental_obligations ro
  left join public.payments p on p.rental_obligation_id = ro.id
  group by ro.id, ro.amount_due
)
update public.rental_obligations ro
set amount_paid = totals.verified_total,
    payment_status = case
      when totals.verified_total >= totals.amount_due then 'paid'::public.payment_status
      when totals.verified_total > 0 then 'partially_paid'::public.payment_status
      when totals.pending_exists then 'pending_verification'::public.payment_status
      when totals.rejected_exists then 'rejected'::public.payment_status
      else 'unpaid'::public.payment_status
    end,
    due_status = case
      when totals.verified_total >= totals.amount_due then 'upcoming'::public.due_status
      when ro.due_date < current_date then 'overdue'::public.due_status
      when ro.due_date = current_date then 'due_today'::public.due_status
      when ro.due_date <= current_date + 31 then 'due_soon'::public.due_status
      else 'upcoming'::public.due_status
    end,
    updated_at = timezone('utc', now())
from payment_totals totals
where totals.id = ro.id
  and (
    ro.amount_paid is distinct from totals.verified_total
    or ro.payment_status is distinct from case
      when totals.verified_total >= totals.amount_due then 'paid'::public.payment_status
      when totals.verified_total > 0 then 'partially_paid'::public.payment_status
      when totals.pending_exists then 'pending_verification'::public.payment_status
      when totals.rejected_exists then 'rejected'::public.payment_status
      else 'unpaid'::public.payment_status
    end
    or ro.due_status is distinct from case
      when totals.verified_total >= totals.amount_due then 'upcoming'::public.due_status
      when ro.due_date < current_date then 'overdue'::public.due_status
      when ro.due_date = current_date then 'due_today'::public.due_status
      when ro.due_date <= current_date + 31 then 'due_soon'::public.due_status
      else 'upcoming'::public.due_status
    end
  );

notify pgrst, 'reload schema';