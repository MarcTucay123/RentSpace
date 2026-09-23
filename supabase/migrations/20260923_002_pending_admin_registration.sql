begin;

-- Public registration may request Admin access, but all Admin requests remain
-- pending. Authorization continues to require an approved Admin profile.
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

  if requested_role not in ('admin', 'landlord', 'tenant') then
    requested_role := 'tenant';
  end if;

  insert into public.users (
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

-- Upgrade existing feature-control installations so Dashboard can be managed
-- for Landlord and Tenant accounts as well.
create or replace function public.validate_user_feature_control()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.user_role;
begin
  select role into target_role
  from public.users
  where id = new.profile_id;

  if target_role = 'landlord' and new.feature_key not in (
    'dashboard', 'approvals', 'units', 'tenants', 'rent_monitoring', 'payments',
    'maintenance', 'messages', 'notifications', 'reports', 'ai_assistant'
  ) then
    raise exception 'Invalid Landlord feature key';
  elsif target_role = 'tenant' and new.feature_key not in (
    'dashboard', 'my_rental', 'maintenance', 'messages', 'notifications'
  ) then
    raise exception 'Invalid Tenant feature key';
  elsif target_role not in ('landlord', 'tenant') then
    raise exception 'Feature controls apply only to Landlord and Tenant accounts';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_user_feature_control() from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;