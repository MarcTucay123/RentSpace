-- Consolidated hosted-schema repair for DormMate registration and approvals.
-- This script intentionally does not reference tenant_profiles.property_id.

begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb;
  requested_role text;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role := coalesce(nullif(metadata ->> 'registration_role', ''), 'tenant');

  if requested_role not in ('landlord', 'tenant') then
    requested_role := 'tenant';
  end if;

  insert into public.profiles (
    id, first_name, middle_name, last_name, mobile_number,
    email, role, account_status
  )
  values (
    new.id,
    coalesce(nullif(metadata ->> 'first_name', ''), 'Pending'),
    nullif(metadata ->> 'middle_name', ''),
    coalesce(nullif(metadata ->> 'last_name', ''), 'User'),
    coalesce(nullif(metadata ->> 'mobile_number', ''), 'N/A'),
    new.email,
    requested_role::public.user_role,
    'pending'
  )
  on conflict (id) do nothing;

  if requested_role = 'tenant' then
    insert into public.tenant_profiles (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_auth_user on auth.users;
create trigger trg_handle_new_auth_user
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill Auth users whose earlier signup did not create an app profile.
-- Only explicit tenant/landlord metadata is accepted; never derive Admin access
-- from user-editable metadata.
insert into public.profiles (
  id, first_name, middle_name, last_name, mobile_number,
  email, role, account_status
)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'first_name', ''), 'Pending'),
  nullif(u.raw_user_meta_data ->> 'middle_name', ''),
  coalesce(nullif(u.raw_user_meta_data ->> 'last_name', ''), 'User'),
  coalesce(nullif(u.raw_user_meta_data ->> 'mobile_number', ''), 'N/A'),
  u.email,
  (u.raw_user_meta_data ->> 'registration_role')::public.user_role,
  'pending'
from auth.users as u
where u.raw_user_meta_data ->> 'registration_role' in ('tenant', 'landlord')
  and not exists (
    select 1 from public.profiles as p where p.id = u.id
  );

insert into public.tenant_profiles (profile_id)
select p.id
from public.profiles as p
where p.role = 'tenant'
  and not exists (
    select 1 from public.tenant_profiles as tp where tp.profile_id = p.id
  );

-- Pending Tenants are visible to approved Landlords for review.
drop policy if exists "profiles_select_pending_tenants_for_landlords" on public.profiles;
create policy "profiles_select_pending_tenants_for_landlords"
on public.profiles for select to authenticated
using (
  role = 'tenant'
  and account_status = 'pending'
  and (select public.is_landlord())
);

-- Approved Tenants remain visible after approval for assignment.
drop policy if exists "profiles_select_approved_tenants_for_landlords" on public.profiles;
create policy "profiles_select_approved_tenants_for_landlords"
on public.profiles for select to authenticated
using (
  role = 'tenant'
  and account_status = 'approved'
  and (select public.is_landlord())
);

-- Approved Landlords may change only pending Tenant statuses. The separate
-- protect_landlord_tenant_review trigger enforces field-level immutability.
drop policy if exists "profiles_review_pending_tenants_by_landlord" on public.profiles;
create policy "profiles_review_pending_tenants_by_landlord"
on public.profiles for update to authenticated
using (
  role = 'tenant'
  and account_status = 'pending'
  and (select public.is_landlord())
)
with check (
  role = 'tenant'
  and account_status in ('approved', 'rejected')
  and (select public.is_landlord())
);

create or replace function public.protect_landlord_tenant_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.role = 'tenant'
     and (select public.is_landlord())
     and not (select public.is_admin()) then
    if old.role <> 'tenant'
       or old.account_status <> 'pending'
       or new.role <> 'tenant'
       or new.account_status not in ('approved', 'rejected') then
      raise exception 'Landlords may only approve or reject pending Tenant accounts';
    end if;

    if new.id is distinct from old.id
       or new.first_name is distinct from old.first_name
       or new.middle_name is distinct from old.middle_name
       or new.last_name is distinct from old.last_name
       or new.mobile_number is distinct from old.mobile_number
       or new.email is distinct from old.email
       or new.profile_photo_url is distinct from old.profile_photo_url
       or new.created_at is distinct from old.created_at then
      raise exception 'Landlords cannot modify Tenant profile details during approval';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_landlord_tenant_review on public.profiles;
create trigger protect_landlord_tenant_review
before update on public.profiles
for each row execute function public.protect_landlord_tenant_review();

notify pgrst, 'reload schema';

commit;