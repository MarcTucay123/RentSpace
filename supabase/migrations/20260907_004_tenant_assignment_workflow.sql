-- Current product scope is one dormitory managed by approved landlords.
-- Let approved landlords see tenant identity rows needed for assignment.
drop policy if exists "profiles_select_approved_tenants_for_landlords" on public.profiles;

create policy "profiles_select_approved_tenants_for_landlords"
on public.profiles
for select
to authenticated
using (
  role = 'tenant'
  and account_status = 'approved'
  and (select public.is_landlord())
);

drop policy if exists "tenant_profiles_select_approved_landlords" on public.tenant_profiles;

create policy "tenant_profiles_select_approved_landlords"
on public.tenant_profiles
for select
to authenticated
using ((select public.is_landlord()));

-- Allow approved landlords to manage assignments. Existing database constraints
-- enforce one active assignment per tenant and one occupant per assignable space.
drop policy if exists "tenant_assignments_manage_approved_landlords" on public.tenant_assignments;

create policy "tenant_assignments_manage_approved_landlords"
on public.tenant_assignments
for all
to authenticated
using ((select public.is_landlord()))
with check ((select public.is_landlord()));

-- Hosted tenant_profiles has no property_id. Validate assignment structure
-- without relying on that legacy/local-only column.
create or replace function public.validate_tenant_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  tenant_role public.user_role;
  tenant_status public.account_status;
  unit_cat public.unit_category;
  room_unit_id uuid;
  bed_room_id uuid;
begin
  select p.role, p.account_status
  into tenant_role, tenant_status
  from public.tenant_profiles as tp
  join public.profiles as p on p.id = tp.profile_id
  where tp.id = new.tenant_profile_id;

  if tenant_role is distinct from 'tenant' then
    raise exception 'Assignment must reference a Tenant profile';
  end if;

  if new.status = 'active' and tenant_status is distinct from 'approved' then
    raise exception 'Only approved Tenants can receive active assignments';
  end if;

  select u.unit_category
  into unit_cat
  from public.units as u
  where u.id = new.unit_id;

  if unit_cat is null then
    raise exception 'Invalid Unit';
  end if;

  if unit_cat::text is distinct from new.assignment_type::text then
    raise exception 'Assignment type must match the Unit category';
  end if;

  if new.room_id is not null then
    select r.unit_id into room_unit_id
    from public.rooms as r
    where r.id = new.room_id;

    if room_unit_id is distinct from new.unit_id then
      raise exception 'Room must belong to the selected Unit';
    end if;
  end if;

  if new.bed_space_id is not null then
    select b.room_id into bed_room_id
    from public.bed_spaces as b
    where b.id = new.bed_space_id;

    if bed_room_id is distinct from new.room_id then
      raise exception 'Bed Space must belong to the selected Room';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_tenant_assignment on public.tenant_assignments;

create trigger trg_validate_tenant_assignment
before insert or update on public.tenant_assignments
for each row execute function public.validate_tenant_assignment();

-- Let approved landlords notify tenant accounts about operational changes.
drop policy if exists "notifications_insert_approved_landlords" on public.notifications;

create policy "notifications_insert_approved_landlords"
on public.notifications
for insert
to authenticated
with check (
  (select public.is_landlord())
  and exists (
    select 1
    from public.profiles as p
    where p.id = recipient_profile_id
      and p.role = 'tenant'
      and p.account_status = 'approved'
  )
);

notify pgrst, 'reload schema';