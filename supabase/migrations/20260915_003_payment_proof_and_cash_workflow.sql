-- Private payment-proof storage. Tenants can upload/read only their own folder;
-- approved landlords can read proofs for payment review.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment_proofs_storage_insert_self" on storage.objects;
create policy "payment_proofs_storage_insert_self"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "payment_proofs_storage_select_self_or_landlord" on storage.objects;
create policy "payment_proofs_storage_select_self_or_landlord"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_landlord())
  )
);

drop policy if exists "payment_proofs_storage_delete_self" on storage.objects;
create policy "payment_proofs_storage_delete_self"
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Insert a pending Tenant GCash payment and its proof metadata atomically.
create or replace function public.submit_tenant_payment_proof(
  p_rental_obligation_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_storage_path text,
  p_original_file_name text,
  p_mime_type text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  tenant_profile_id_value uuid;
  payment_id_value uuid;
  outstanding_balance numeric;
  pending_payment_exists boolean;
begin
  select tp.id, greatest(ro.amount_due - ro.amount_paid, 0)
  into tenant_profile_id_value, outstanding_balance
  from public.rental_obligations ro
  join public.tenant_assignments ta on ta.id = ro.tenant_assignment_id
  join public.tenant_profiles tp on tp.id = ta.tenant_profile_id
  where ro.id = p_rental_obligation_id
    and ta.status = 'active'
    and tp.profile_id = (select auth.uid())
    and ro.payment_status <> 'paid';

  if tenant_profile_id_value is null then
    raise exception 'No payable rental obligation was found for this Tenant';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;

  if p_amount > outstanding_balance then
    raise exception 'Payment amount cannot exceed the outstanding balance';
  end if;

  select exists (
    select 1
    from public.payments p
    where p.rental_obligation_id = p_rental_obligation_id
      and p.verification_status = 'pending'
  ) into pending_payment_exists;

  if pending_payment_exists then
    raise exception 'A payment proof is already awaiting review';
  end if;

  if split_part(p_storage_path, '/', 1) is distinct from (select auth.uid())::text then
    raise exception 'Payment proof path must belong to the current user';
  end if;

  insert into public.payments (
    rental_obligation_id,
    tenant_profile_id,
    payment_method,
    amount,
    payment_date,
    verification_status
  ) values (
    p_rental_obligation_id,
    tenant_profile_id_value,
    'gcash',
    p_amount,
    p_payment_date,
    'pending'
  )
  returning id into payment_id_value;

  insert into public.payment_proofs (
    payment_id,
    storage_path,
    original_file_name,
    mime_type,
    uploaded_by
  ) values (
    payment_id_value,
    p_storage_path,
    p_original_file_name,
    p_mime_type,
    (select auth.uid())
  );

  return payment_id_value;
end;
$$;

revoke all on function public.submit_tenant_payment_proof(uuid, numeric, date, text, text, text) from public;
grant execute on function public.submit_tenant_payment_proof(uuid, numeric, date, text, text, text) to authenticated;

-- Payment inserts invoke this trigger. Run only its narrowly scoped aggregate
-- update as the function owner so Tenants do not need general obligation UPDATE.
alter function public.recalculate_rental_obligation_payment_status() security definer;
alter function public.recalculate_rental_obligation_payment_status() set search_path = '';
revoke all on function public.recalculate_rental_obligation_payment_status() from public;
revoke all on function public.recalculate_rental_obligation_payment_status() from anon, authenticated;

-- Hosted workflow: approved landlords can review submissions and record verified
-- cash payments. Existing Tenant policies still restrict Tenant access to self.
drop policy if exists "payments_manage_approved_landlords" on public.payments;
create policy "payments_manage_approved_landlords"
on public.payments for all to authenticated
using ((select public.is_landlord()))
with check ((select public.is_landlord()));

drop policy if exists "payment_proofs_select_approved_landlords" on public.payment_proofs;
create policy "payment_proofs_select_approved_landlords"
on public.payment_proofs for select to authenticated
using ((select public.is_landlord()));

notify pgrst, 'reload schema';