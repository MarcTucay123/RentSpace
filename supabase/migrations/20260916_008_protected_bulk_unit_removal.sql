-- Permanently remove only units that have never been referenced by tenant or
-- maintenance history. Unused rooms and bed spaces cascade with their unit.
create or replace function public.remove_unused_units(p_unit_ids uuid[])
returns table (removed_count integer, protected_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_ids uuid[];
begin
  if not (select public.is_landlord()) then
    raise exception 'Only an approved landlord may remove units';
  end if;

  select coalesce(array_agg(distinct requested_id), array[]::uuid[])
  into requested_ids
  from unnest(coalesce(p_unit_ids, array[]::uuid[])) as requested_id;

  if cardinality(requested_ids) = 0 then
    return query select 0, 0;
    return;
  end if;

  select count(*)::integer
  into protected_count
  from public.units u
  where u.id = any(requested_ids)
    and (
      exists (select 1 from public.tenant_assignments ta where ta.unit_id = u.id)
      or exists (select 1 from public.maintenance_requests mr where mr.unit_id = u.id)
    );

  with deleted as (
    delete from public.units u
    where u.id = any(requested_ids)
      and not exists (select 1 from public.tenant_assignments ta where ta.unit_id = u.id)
      and not exists (select 1 from public.maintenance_requests mr where mr.unit_id = u.id)
    returning u.id
  )
  select count(*)::integer into removed_count from deleted;

  return next;
end;
$$;

revoke all on function public.remove_unused_units(uuid[]) from public;
revoke all on function public.remove_unused_units(uuid[]) from anon;
grant execute on function public.remove_unused_units(uuid[]) to authenticated;

notify pgrst, 'reload schema';