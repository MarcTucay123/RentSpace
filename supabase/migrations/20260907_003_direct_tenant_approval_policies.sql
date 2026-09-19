-- Approved landlords need to see unassigned pending tenants in the current
-- single-dormitory workflow. Restrict this access to pending tenant rows only.
drop policy if exists "users_select_pending_tenants_for_landlords" on public.users;

create policy "users_select_pending_tenants_for_landlords"
on public.users
for select
to authenticated
using (
  role = 'tenant'
  and account_status = 'pending'
  and (select public.is_landlord())
);

-- RLS permits only pending tenant rows to be targeted by an approved landlord.
drop policy if exists "users_review_pending_tenants_by_landlord" on public.users;

create policy "users_review_pending_tenants_by_landlord"
on public.users
for update
to authenticated
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

-- Defense in depth: when a landlord performs the update, only account_status
-- may change, and only from pending to approved/rejected for a tenant.
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
      raise exception 'Landlords may only approve or reject pending tenant accounts';
    end if;

    if new.id is distinct from old.id
       or new.first_name is distinct from old.first_name
       or new.middle_name is distinct from old.middle_name
       or new.last_name is distinct from old.last_name
       or new.mobile_number is distinct from old.mobile_number
       or new.email is distinct from old.email
       or new.profile_photo_url is distinct from old.profile_photo_url
       or new.created_at is distinct from old.created_at then
      raise exception 'Landlords cannot modify tenant profile details during approval';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_landlord_tenant_review on public.users;

create trigger protect_landlord_tenant_review
before update on public.users
for each row execute function public.protect_landlord_tenant_review();

notify pgrst, 'reload schema';