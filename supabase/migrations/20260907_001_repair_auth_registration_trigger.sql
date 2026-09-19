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

  insert into public.users (
    id,
    first_name,
    middle_name,
    last_name,
    mobile_number,
    email,
    role,
    account_status
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
  on conflict (id) do update
    set first_name = excluded.first_name,
        middle_name = excluded.middle_name,
        last_name = excluded.last_name,
        mobile_number = excluded.mobile_number,
        email = excluded.email,
        role = excluded.role,
        account_status = 'pending';

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

-- Repair Tenant and Landlord Auth users created before this trigger existed.
-- Never derive Admin access from user-editable signup metadata.
insert into public.users (
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
    from public.users as p
    where p.id = u.id
  );

insert into public.tenant_profiles (profile_id)
select p.id
from public.users as p
where p.role = 'tenant'
  and not exists (
    select 1
    from public.tenant_profiles as tp
    where tp.profile_id = p.id
  );

notify pgrst, 'reload schema';