-- Repair application profiles for prior signups that completed in Auth before
-- the profile trigger was installed. Only explicit tenant/landlord metadata is
-- accepted; Admin authorization is never derived from user-editable metadata.
insert into public.profiles (
  id,
  first_name,
  middle_name,
  last_name,
  mobile_number,
  email,
  role,
  account_status
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
    select 1
    from public.profiles as p
    where p.id = u.id
  );

insert into public.tenant_profiles (profile_id)
select p.id
from public.profiles as p
where p.role = 'tenant'
  and not exists (
    select 1
    from public.tenant_profiles as tp
    where tp.profile_id = p.id
  );

create or replace function public.list_pending_registrations(target_role public.user_role)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_role = 'landlord' then
    if not (select public.is_admin()) then
      raise exception 'Only an approved admin can review landlord registrations';
    end if;
  elsif target_role = 'tenant' then
    if not (select public.is_landlord()) then
      raise exception 'Only an approved landlord can review tenant registrations';
    end if;
  else
    raise exception 'Unsupported registration role';
  end if;

  return query
  select p.*
  from public.profiles as p
  where p.role = target_role
    and p.account_status = 'pending'
  order by p.created_at asc;
end;
$$;

create or replace function public.review_pending_registration(
  target_profile_id uuid,
  target_role public.user_role,
  new_status public.account_status
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if new_status not in ('approved', 'rejected') then
    raise exception 'Registration status must be approved or rejected';
  end if;

  if target_role = 'landlord' then
    if not (select public.is_admin()) then
      raise exception 'Only an approved admin can review landlord registrations';
    end if;
  elsif target_role = 'tenant' then
    if not (select public.is_landlord()) then
      raise exception 'Only an approved landlord can review tenant registrations';
    end if;

    if not exists (
      select 1
      from public.tenant_profiles as tp
      where tp.profile_id = target_profile_id
    ) then
      raise exception 'Tenant registration record was not found';
    end if;
  else
    raise exception 'Unsupported registration role';
  end if;

  update public.profiles
  set account_status = new_status
  where id = target_profile_id
    and role = target_role
    and account_status = 'pending';

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.list_pending_registrations(public.user_role) from public, anon;
revoke all on function public.review_pending_registration(uuid, public.user_role, public.account_status) from public, anon;

grant execute on function public.list_pending_registrations(public.user_role) to authenticated;
grant execute on function public.review_pending_registration(uuid, public.user_role, public.account_status) to authenticated;

-- Make newly created RPC functions immediately discoverable by PostgREST.
notify pgrst, 'reload schema';