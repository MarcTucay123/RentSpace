-- Current product scope is one dormitory managed by approved landlords.
-- Allow those landlords to create and maintain the billing obligation attached
-- to a Tenant assignment. Tenant read access remains governed by the existing
-- self-select policy.
drop policy if exists "rental_obligations_manage_approved_landlords" on public.rental_obligations;

create policy "rental_obligations_manage_approved_landlords"
on public.rental_obligations
for all
to authenticated
using ((select public.is_landlord()))
with check ((select public.is_landlord()));

notify pgrst, 'reload schema';