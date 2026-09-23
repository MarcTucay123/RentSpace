begin;

create table if not exists public.user_feature_controls (
  profile_id uuid not null references public.users(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, feature_key),
  constraint user_feature_controls_feature_key_not_blank check (length(trim(feature_key)) > 0)
);

create index if not exists user_feature_controls_profile_id_idx
on public.user_feature_controls(profile_id);

drop trigger if exists trg_user_feature_controls_updated_at on public.user_feature_controls;
create trigger trg_user_feature_controls_updated_at
before update on public.user_feature_controls
for each row execute function public.set_updated_at();

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
    'approvals', 'units', 'tenants', 'rent_monitoring', 'payments',
    'maintenance', 'messages', 'notifications', 'reports', 'ai_assistant'
  ) then
    raise exception 'Invalid Landlord feature key';
  elsif target_role = 'tenant' and new.feature_key not in (
    'my_rental', 'maintenance', 'messages', 'notifications'
  ) then
    raise exception 'Invalid Tenant feature key';
  elsif target_role not in ('landlord', 'tenant') then
    raise exception 'Feature controls apply only to Landlord and Tenant accounts';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_user_feature_control() from public, anon, authenticated;

drop trigger if exists trg_validate_user_feature_control on public.user_feature_controls;
create trigger trg_validate_user_feature_control
before insert or update on public.user_feature_controls
for each row execute function public.validate_user_feature_control();

alter table public.user_feature_controls enable row level security;

revoke all on public.user_feature_controls from anon;
grant select, insert, update, delete on public.user_feature_controls to authenticated;

create policy "feature_controls_select_self_or_admin"
on public.user_feature_controls for select to authenticated
using (profile_id = (select auth.uid()) or (select public.is_admin()));

create policy "feature_controls_manage_admin"
on public.user_feature_controls for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

commit;