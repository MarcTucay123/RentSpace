-- Protected room and bed-space removal for the single-dormitory workflow.
-- Historical assignment and maintenance references always prevent deletion.
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

  select count(*)::integer
  into protected_bed_spaces
  from public.bed_spaces bs
  join public.rooms r on r.id = bs.room_id
  where r.unit_id = p_unit_id
    and bs.id = any(requested_bed_ids)
    and (
      exists (select 1 from public.tenant_assignments ta where ta.bed_space_id = bs.id)
      or exists (select 1 from public.maintenance_requests mr where mr.bed_space_id = bs.id)
    );

  with deleted as (
    delete from public.bed_spaces bs
    using public.rooms r
    where bs.room_id = r.id
      and r.unit_id = p_unit_id
      and bs.id = any(requested_bed_ids)
      and not exists (select 1 from public.tenant_assignments ta where ta.bed_space_id = bs.id)
      and not exists (select 1 from public.maintenance_requests mr where mr.bed_space_id = bs.id)
    returning bs.id
  )
  select count(*)::integer into removed_bed_spaces from deleted;

  select count(*)::integer
  into protected_rooms
  from public.rooms r
  where r.unit_id = p_unit_id
    and r.id = any(requested_room_ids)
    and (
      exists (select 1 from public.tenant_assignments ta where ta.room_id = r.id)
      or exists (select 1 from public.maintenance_requests mr where mr.room_id = r.id)
      or exists (
        select 1 from public.bed_spaces bs
        where bs.room_id = r.id
          and (
            exists (select 1 from public.tenant_assignments ta where ta.bed_space_id = bs.id)
            or exists (select 1 from public.maintenance_requests mr where mr.bed_space_id = bs.id)
          )
      )
    );

  with deleted as (
    delete from public.rooms r
    where r.unit_id = p_unit_id
      and r.id = any(requested_room_ids)
      and not exists (select 1 from public.tenant_assignments ta where ta.room_id = r.id)
      and not exists (select 1 from public.maintenance_requests mr where mr.room_id = r.id)
      and not exists (
        select 1 from public.bed_spaces bs
        where bs.room_id = r.id
          and (
            exists (select 1 from public.tenant_assignments ta where ta.bed_space_id = bs.id)
            or exists (select 1 from public.maintenance_requests mr where mr.bed_space_id = bs.id)
          )
      )
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