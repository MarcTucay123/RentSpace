-- Tenant maintenance photos and approved-landlord request management for the
-- hosted single-dormitory workflow.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'maintenance-photos',
  'maintenance-photos',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "maintenance_photos_insert_own_folder" on storage.objects;
create policy "maintenance_photos_insert_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'maintenance-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "maintenance_photos_select_self_or_landlord" on storage.objects;
create policy "maintenance_photos_select_self_or_landlord"
on storage.objects for select to authenticated
using (
  bucket_id = 'maintenance-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_landlord())
  )
);

drop policy if exists "maintenance_photos_delete_own_folder" on storage.objects;
create policy "maintenance_photos_delete_own_folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'maintenance-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create table if not exists public.maintenance_attachments (
  id uuid primary key default gen_random_uuid(),
  maintenance_request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  storage_path text not null unique,
  original_file_name text not null,
  mime_type text not null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint maintenance_attachments_mime_chk check (mime_type in ('image/png', 'image/jpeg', 'image/webp'))
);

create index if not exists maintenance_attachments_request_idx
on public.maintenance_attachments (maintenance_request_id, created_at);

alter table public.maintenance_attachments enable row level security;
revoke all on public.maintenance_attachments from anon;
grant select, insert on public.maintenance_attachments to authenticated;

drop policy if exists "maintenance_attachments_select_self_or_landlord" on public.maintenance_attachments;
create policy "maintenance_attachments_select_self_or_landlord"
on public.maintenance_attachments for select to authenticated
using (
  uploaded_by = (select auth.uid())
  or (select public.is_landlord())
);

drop policy if exists "maintenance_attachments_insert_self" on public.maintenance_attachments;
create policy "maintenance_attachments_insert_self"
on public.maintenance_attachments for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1
    from public.maintenance_requests mr
    join public.tenant_profiles tp on tp.id = mr.tenant_profile_id
    where mr.id = maintenance_request_id
      and tp.profile_id = (select auth.uid())
  )
);

drop policy if exists "maintenance_requests_manage_approved_landlords" on public.maintenance_requests;
create policy "maintenance_requests_manage_approved_landlords"
on public.maintenance_requests for update to authenticated
using ((select public.is_landlord()))
with check ((select public.is_landlord()));

create or replace function public.submit_tenant_maintenance_request(
  p_location text,
  p_category text,
  p_description text,
  p_storage_paths text[] default array[]::text[],
  p_original_file_names text[] default array[]::text[],
  p_mime_types text[] default array[]::text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  tenant_record record;
  request_id uuid;
  attachment_index integer;
begin
  if cardinality(p_storage_paths) > 3 then
    raise exception 'A maximum of 3 maintenance photos is allowed';
  end if;
  if cardinality(p_storage_paths) <> cardinality(p_original_file_names)
     or cardinality(p_storage_paths) <> cardinality(p_mime_types) then
    raise exception 'Maintenance attachment metadata is incomplete';
  end if;

  select tp.id as tenant_profile_id, ta.unit_id, ta.room_id, ta.bed_space_id
  into tenant_record
  from public.tenant_profiles tp
  join public.tenant_assignments ta on ta.tenant_profile_id = tp.id
  where tp.profile_id = (select auth.uid())
    and ta.status = 'active'
  order by ta.start_date desc
  limit 1;

  if tenant_record.tenant_profile_id is null then
    raise exception 'An active rental assignment is required';
  end if;

  for attachment_index in 1..cardinality(p_storage_paths) loop
    if split_part(p_storage_paths[attachment_index], '/', 1) is distinct from (select auth.uid())::text then
      raise exception 'Maintenance photo path must belong to the current user';
    end if;
    if p_mime_types[attachment_index] not in ('image/png', 'image/jpeg', 'image/webp') then
      raise exception 'Unsupported maintenance photo type';
    end if;
  end loop;

  insert into public.maintenance_requests (
    tenant_profile_id, unit_id, room_id, bed_space_id, category, description, image_path
  ) values (
    tenant_record.tenant_profile_id,
    tenant_record.unit_id,
    tenant_record.room_id,
    tenant_record.bed_space_id,
    trim(p_category),
    'Location: ' || trim(p_location) || E'\n\n' || trim(p_description),
    p_storage_paths[1]
  ) returning id into request_id;

  for attachment_index in 1..cardinality(p_storage_paths) loop
    insert into public.maintenance_attachments (
      maintenance_request_id, storage_path, original_file_name, mime_type, uploaded_by
    ) values (
      request_id,
      p_storage_paths[attachment_index],
      p_original_file_names[attachment_index],
      p_mime_types[attachment_index],
      (select auth.uid())
    );
  end loop;

  return request_id;
end;
$$;

revoke all on function public.submit_tenant_maintenance_request(text, text, text, text[], text[], text[]) from public;
revoke all on function public.submit_tenant_maintenance_request(text, text, text, text[], text[], text[]) from anon;
grant execute on function public.submit_tenant_maintenance_request(text, text, text, text[], text[], text[]) to authenticated;

notify pgrst, 'reload schema';