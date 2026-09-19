-- Bed-space occupancy is controlled by active tenant assignments, never by a
-- manually selected form value. Keep the stored status synchronized so every
-- database consumer sees the same Available/Occupied state.
create or replace function public.sync_bed_space_occupancy(target_bed_space_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_bed_space_id is null then
    return;
  end if;

  update public.bed_spaces as bed
  set status = case
    when exists (
      select 1
      from public.tenant_assignments as assignment
      where assignment.bed_space_id = target_bed_space_id
        and assignment.assignment_type = 'bed_space'
        and assignment.status = 'active'
    ) then 'occupied'::public.bed_space_status
    else 'available'::public.bed_space_status
  end
  where bed.id = target_bed_space_id;
end;
$$;

revoke all on function public.sync_bed_space_occupancy(uuid) from public;

create or replace function public.sync_assignment_bed_space_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.sync_bed_space_occupancy(new.bed_space_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.sync_bed_space_occupancy(old.bed_space_id);
    return old;
  end if;

  perform public.sync_bed_space_occupancy(old.bed_space_id);
  if new.bed_space_id is distinct from old.bed_space_id then
    perform public.sync_bed_space_occupancy(new.bed_space_id);
  end if;

  return new;
end;
$$;

revoke all on function public.sync_assignment_bed_space_status() from public;

drop trigger if exists trg_sync_assignment_bed_space_status on public.tenant_assignments;
create trigger trg_sync_assignment_bed_space_status
after insert or update of bed_space_id, assignment_type, status or delete
on public.tenant_assignments
for each row execute function public.sync_assignment_bed_space_status();

update public.bed_spaces as bed
set status = case
  when exists (
    select 1
    from public.tenant_assignments as assignment
    where assignment.bed_space_id = bed.id
      and assignment.assignment_type = 'bed_space'
      and assignment.status = 'active'
  ) then 'occupied'::public.bed_space_status
  else 'available'::public.bed_space_status
end;

notify pgrst, 'reload schema';