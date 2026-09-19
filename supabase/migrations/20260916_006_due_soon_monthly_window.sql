-- Treat the next monthly obligation as due soon immediately after the current
-- month is paid. A 31-day window covers all calendar-month transitions.
create or replace function public.sync_rental_obligation_due_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.due_status := case
    when new.payment_status = 'paid' then 'upcoming'::public.due_status
    when new.due_date < current_date then 'overdue'::public.due_status
    when new.due_date = current_date then 'due_today'::public.due_status
    when new.due_date <= current_date + 31 then 'due_soon'::public.due_status
    else 'upcoming'::public.due_status
  end;
  return new;
end;
$$;

revoke all on function public.sync_rental_obligation_due_status() from public;
revoke all on function public.sync_rental_obligation_due_status() from anon, authenticated;

drop trigger if exists trg_sync_rental_obligation_due_status on public.rental_obligations;
create trigger trg_sync_rental_obligation_due_status
before insert or update of due_date, payment_status on public.rental_obligations
for each row execute function public.sync_rental_obligation_due_status();

update public.rental_obligations
set due_status = case
  when payment_status = 'paid' then 'upcoming'::public.due_status
  when due_date < current_date then 'overdue'::public.due_status
  when due_date = current_date then 'due_today'::public.due_status
  when due_date <= current_date + 31 then 'due_soon'::public.due_status
  else 'upcoming'::public.due_status
end
where due_status is distinct from case
  when payment_status = 'paid' then 'upcoming'::public.due_status
  when due_date < current_date then 'overdue'::public.due_status
  when due_date = current_date then 'due_today'::public.due_status
  when due_date <= current_date + 31 then 'due_soon'::public.due_status
  else 'upcoming'::public.due_status
end;

notify pgrst, 'reload schema';