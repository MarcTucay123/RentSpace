-- Rename the application identity table without affecting Supabase Auth's
-- separate auth.users table. Keep every reference schema-qualified.

begin;

-- ALTER TABLE RENAME takes an ACCESS EXCLUSIVE lock. Fail quickly during a
-- busy deployment so the migration can be retried in a quieter window.
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$
begin
  if to_regclass('public.profiles') is not null
     and to_regclass('public.users') is not null then
    raise exception 'Cannot rename public.profiles: public.users already exists';
  end if;

  if to_regclass('public.profiles') is not null then
    alter table public.profiles rename to users;
  elsif to_regclass('public.users') is null then
    raise exception 'Cannot rename application user table: neither public.profiles nor public.users exists';
  end if;
end;
$$;

-- PostgreSQL preserves foreign keys, grants, RLS state, triggers, and policies
-- by object identity during a table rename. Recreate function bodies because
-- SQL and PL/pgSQL source text is not rewritten when referenced tables move.
do $$
declare
  function_definition text;
begin
  for function_definition in
    select pg_get_functiondef(p.oid)
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosrc like '%public.profiles%'
  loop
    execute replace(function_definition, 'public.profiles', 'public.users');
  end loop;
end;
$$;

-- Normalize names that PostgreSQL intentionally leaves unchanged when the
-- underlying table is renamed.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.users'::regclass and conname = 'profiles_pkey'
  ) and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.users'::regclass and conname = 'users_pkey'
  ) then
    alter table public.users rename constraint profiles_pkey to users_pkey;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.users'::regclass and conname = 'profiles_email_key'
  ) and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.users'::regclass and conname = 'users_email_key'
  ) then
    alter table public.users rename constraint profiles_email_key to users_email_key;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.users'::regclass and conname = 'profiles_email_format_chk'
  ) and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.users'::regclass and conname = 'users_email_format_chk'
  ) then
    alter table public.users rename constraint profiles_email_format_chk to users_email_format_chk;
  end if;

  if to_regclass('public.profiles_role_status_idx') is not null
     and to_regclass('public.users_role_status_idx') is null then
    alter index public.profiles_role_status_idx rename to users_role_status_idx;
  end if;

  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.users'::regclass
      and tgname = 'set_profiles_updated_at'
      and not tgisinternal
  ) and not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.users'::regclass
      and tgname = 'set_users_updated_at'
      and not tgisinternal
  ) then
    alter trigger set_profiles_updated_at on public.users rename to set_users_updated_at;
  end if;
end;
$$;

do $$
declare
  policy_rename record;
begin
  for policy_rename in
    select *
    from (values
      ('profiles_select_self_admin_or_related_landlord', 'users_select_self_admin_or_related_landlord'),
      ('profiles_update_self_or_admin', 'users_update_self_or_admin'),
      ('profiles_select_pending_tenants_for_landlords', 'users_select_pending_tenants_for_landlords'),
      ('profiles_review_pending_tenants_by_landlord', 'users_review_pending_tenants_by_landlord'),
      ('profiles_select_approved_tenants_for_landlords', 'users_select_approved_tenants_for_landlords'),
      ('profiles_select_approved_landlords_for_tenants', 'users_select_approved_landlords_for_tenants')
    ) as names(old_name, new_name)
  loop
    if exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'users'
        and policyname = policy_rename.old_name
    ) and not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'users'
        and policyname = policy_rename.new_name
    ) then
      execute format(
        'alter policy %I on public.users rename to %I',
        policy_rename.old_name,
        policy_rename.new_name
      );
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;