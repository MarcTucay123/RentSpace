-- Protect rooms and bed spaces only while they are currently assigned.
-- Completed/cancelled assignments remain preserved at the unit level after
-- their former room or bed-space references are cleared for deletion.
create or replace function public.remove_unused_unit_structure(
  p_unit_id uuid,
  p_room_ids uuid[] default array[]::uuid[],
  p_bed_space_ids uuid[] default array[]::uuid[]
)
returns table (
  removed_rooms integer,
  protected_rooms integer,
  removed_bed_spaces integer,
  protected_bed_spaces integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_room_ids uuid[];
  requested_bed_ids uuid[];
  removable_room_ids uuid[];
  removable_bed_ids uuid[];
begin
  if not (select public.is_landlord()) then
    raise exception 'Only an approved landlord may remove unit structures';
  end if;

  select coalesce(array_agg(distinct requested_id), array[]::uuid[])
  into requested_room_ids
  from unnest(coalesce(p_room_ids, array[]::uuid[])) as requested_id;

  select coalesce(array_agg(distinct requested_id), array[]::uuid[])
  into requested_bed_ids
  from unnest(coalesce(p_bed_space_ids, array[]::uuid[])) as requested_id;

  select coalesce(array_agg(bs.id), array[]::uuid[])
  into removable_bed_ids
  from public.bed_spaces bs
  join public.rooms r on r.id = bs.room_id
  where r.unit_id = p_unit_id
    and bs.id = any(requested_bed_ids)
    and not exists (
      select 1
      from public.tenant_assignments ta
      where ta.bed_space_id = bs.id
        and ta.status = 'active'
    );

  select count(*)::integer
  into protected_bed_spaces
  from public.bed_spaces bs
  join public.rooms r on r.id = bs.room_id
  where r.unit_id = p_unit_id
    and bs.id = any(requested_bed_ids)
    and exists (
      select 1
      from public.tenant_assignments ta
      where ta.bed_space_id = bs.id
        and ta.status = 'active'
    );

  update public.maintenance_requests
  set bed_space_id = null
  where bed_space_id = any(removable_bed_ids);

  update public.tenant_assignments
  set bed_space_id = null
  where bed_space_id = any(removable_bed_ids)
    and status <> 'active';

  with deleted as (
    delete from public.bed_spaces bs
    where bs.id = any(removable_bed_ids)
    returning bs.id
  )
  select count(*)::integer into removed_bed_spaces from deleted;

  select coalesce(array_agg(r.id), array[]::uuid[])
  into removable_room_ids
  from public.rooms r
  where r.unit_id = p_unit_id
    and r.id = any(requested_room_ids)
    and not exists (
      select 1
      from public.tenant_assignments ta
      where ta.room_id = r.id
        and ta.status = 'active'
    )
    and not exists (
      select 1
      from public.bed_spaces bs
      join public.tenant_assignments ta on ta.bed_space_id = bs.id
      where bs.room_id = r.id
        and ta.status = 'active'
    );

  select count(*)::integer
  into protected_rooms
  from public.rooms r
  where r.unit_id = p_unit_id
    and r.id = any(requested_room_ids)
    and (
      exists (
        select 1
        from public.tenant_assignments ta
        where ta.room_id = r.id
          and ta.status = 'active'
      )
      or exists (
        select 1
        from public.bed_spaces bs
        join public.tenant_assignments ta on ta.bed_space_id = bs.id
        where bs.room_id = r.id
          and ta.status = 'active'
      )
    );

  update public.maintenance_requests mr
  set room_id = null,
      bed_space_id = null
  where mr.room_id = any(removable_room_ids)
     or exists (
       select 1
       from public.bed_spaces bs
       where bs.room_id = any(removable_room_ids)
         and bs.id = mr.bed_space_id
     );

  update public.tenant_assignments ta
  set room_id = null,
      bed_space_id = null
  where ta.status <> 'active'
    and (
      ta.room_id = any(removable_room_ids)
      or exists (
        select 1
        from public.bed_spaces bs
        where bs.room_id = any(removable_room_ids)
          and bs.id = ta.bed_space_id
      )
    );

  with deleted as (
    delete from public.rooms r
    where r.id = any(removable_room_ids)
    returning r.id
  )
  select count(*)::integer into removed_rooms from deleted;

  return next;
end;
$$;

revoke all on function public.remove_unused_unit_structure(uuid, uuid[], uuid[]) from public;
revoke all on function public.remove_unused_unit_structure(uuid, uuid[], uuid[]) from anon;
grant execute on function public.remove_unused_unit_structure(uuid, uuid[], uuid[]) to authenticated;

notify pgrst, 'reload schema';