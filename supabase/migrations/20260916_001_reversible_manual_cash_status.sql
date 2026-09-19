-- Manage landlord-entered cash payments atomically without deleting payment history.
-- Reversals remain visible as rejected cash records with a fixed audit reason.
create or replace function public.set_manual_cash_payment_status(
  p_rental_obligation_id uuid,
  p_payment_status text,
  p_cash_payment_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  obligation_record record;
  cash_payment_record public.payments%rowtype;
  outstanding_balance numeric(12,2);
  result_payment_id uuid;
begin
  if not (select public.is_landlord()) then
    raise exception 'Only approved landlords can manage cash payment status';
  end if;

  if p_payment_status not in ('paid', 'unpaid') then
    raise exception 'Payment status must be paid or unpaid';
  end if;

  select ro.id, ro.amount_due, ro.amount_paid, ta.tenant_profile_id
  into obligation_record
  from public.rental_obligations ro
  join public.tenant_assignments ta on ta.id = ro.tenant_assignment_id
  where ro.id = p_rental_obligation_id
  for update of ro;

  if obligation_record.id is null then
    raise exception 'Rental obligation was not found or is not available to this landlord';
  end if;

  if p_cash_payment_id is not null then
    select p.*
    into cash_payment_record
    from public.payments p
    where p.id = p_cash_payment_id
      and p.rental_obligation_id = p_rental_obligation_id
      and p.payment_method = 'cash'
    for update;

    if cash_payment_record.id is null then
      raise exception 'The selected cash payment record could not be found';
    end if;
  end if;

  if p_payment_status = 'unpaid' then
    if cash_payment_record.id is null then
      return null;
    end if;

    if cash_payment_record.verification_status <> 'rejected'
       or cash_payment_record.rejection_reason is distinct from 'Manual cash payment reversed by landlord.' then
      update public.payments
      set verification_status = 'rejected',
          verified_by = (select auth.uid()),
          verified_at = timezone('utc', now()),
          rejection_reason = 'Manual cash payment reversed by landlord.'
      where id = cash_payment_record.id;
    end if;

    return cash_payment_record.id;
  end if;

  if cash_payment_record.id is not null and cash_payment_record.verification_status = 'verified' then
    return cash_payment_record.id;
  end if;

  outstanding_balance := greatest(obligation_record.amount_due - obligation_record.amount_paid, 0);

  if cash_payment_record.id is not null then
    if cash_payment_record.amount > outstanding_balance then
      raise exception 'This cash record exceeds the current outstanding balance';
    end if;

    update public.payments
    set verification_status = 'verified',
        verified_by = (select auth.uid()),
        verified_at = timezone('utc', now()),
        rejection_reason = null
    where id = cash_payment_record.id
    returning id into result_payment_id;

    return result_payment_id;
  end if;

  if outstanding_balance <= 0 then
    raise exception 'This rental obligation is already fully paid';
  end if;

  insert into public.payments (
    rental_obligation_id,
    tenant_profile_id,
    payment_method,
    amount,
    payment_date,
    verification_status,
    verified_by,
    verified_at
  ) values (
    obligation_record.id,
    obligation_record.tenant_profile_id,
    'cash',
    outstanding_balance,
    current_date,
    'verified',
    (select auth.uid()),
    timezone('utc', now())
  )
  returning id into result_payment_id;

  return result_payment_id;
end;
$$;

revoke all on function public.set_manual_cash_payment_status(uuid, text, uuid) from public;
revoke all on function public.set_manual_cash_payment_status(uuid, text, uuid) from anon;
grant execute on function public.set_manual_cash_payment_status(uuid, text, uuid) to authenticated;

notify pgrst, 'reload schema';