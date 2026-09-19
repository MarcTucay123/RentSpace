create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'landlord', 'tenant');
create type public.account_status as enum ('pending', 'approved', 'rejected', 'inactive');
create type public.property_status as enum ('active', 'inactive');
create type public.unit_category as enum ('bed_space', 'room_space', 'apartment');
create type public.unit_status as enum ('active', 'inactive');
create type public.bed_space_status as enum ('available', 'occupied', 'inactive');
create type public.assignment_type as enum ('bed_space', 'room_space', 'apartment');
create type public.assignment_status as enum ('active', 'completed', 'cancelled');
create type public.due_status as enum ('upcoming', 'due_soon', 'due_today', 'overdue');
create type public.payment_status as enum ('unpaid', 'pending_verification', 'partially_paid', 'paid', 'rejected');
create type public.payment_method as enum ('cash', 'gcash');
create type public.payment_verification_status as enum ('pending', 'verified', 'rejected');
create type public.maintenance_status as enum ('pending', 'acknowledged', 'in_progress', 'resolved');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  middle_name text,
  last_name text not null,
  mobile_number text not null,
  email text unique,
  role public.user_role not null default 'tenant',
  account_status public.account_status not null default 'pending',
  profile_photo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint users_email_format_chk check (
    email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  )
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.users(id) on delete restrict,
  property_name text not null,
  property_type text,
  description text,
  address text,
  status public.property_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index one_active_property_per_landlord_name_idx
  on public.properties (landlord_id, lower(property_name));

create table public.tenant_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete restrict,
  emergency_contact_name text,
  emergency_contact_number text,
  address text,
  notes text,
  contract_reference text,
  move_in_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_name text not null,
  unit_category public.unit_category not null,
  description text,
  rental_rate numeric(12,2),
  status public.unit_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint units_rental_rate_nonnegative_chk check (rental_rate is null or rental_rate >= 0)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  room_number text not null,
  rental_rate numeric(12,2),
  status public.unit_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rooms_unit_room_number_uniq unique (unit_id, room_number),
  constraint rooms_rental_rate_nonnegative_chk check (rental_rate is null or rental_rate >= 0)
);

create table public.bed_spaces (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  bed_label text not null,
  rental_rate numeric(12,2),
  status public.bed_space_status not null default 'available',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bed_spaces_room_bed_label_uniq unique (room_id, bed_label),
  constraint bed_spaces_rental_rate_nonnegative_chk check (rental_rate is null or rental_rate >= 0)
);

create table public.tenant_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_profile_id uuid not null references public.tenant_profiles(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  room_id uuid references public.rooms(id) on delete restrict,
  bed_space_id uuid references public.bed_spaces(id) on delete restrict,
  assignment_type public.assignment_type not null,
  start_date date not null,
  rent_due_date date,
  end_date date,
  status public.assignment_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_assignments_date_order_chk check (end_date is null or end_date >= start_date),
  constraint tenant_assignments_rent_due_date_chk check (rent_due_date is null or rent_due_date >= start_date),
  constraint tenant_assignments_structure_chk check (
    (assignment_type = 'bed_space' and room_id is not null and bed_space_id is not null)
    or (assignment_type = 'room_space' and room_id is not null and bed_space_id is null)
    or (assignment_type = 'apartment' and room_id is null and bed_space_id is null)
  )
);

create table public.rental_obligations (
  id uuid primary key default gen_random_uuid(),
  tenant_assignment_id uuid not null references public.tenant_assignments(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  amount_due numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  due_status public.due_status not null default 'upcoming',
  payment_status public.payment_status not null default 'unpaid',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rental_obligations_period_order_chk check (period_end >= period_start),
  constraint rental_obligations_amount_due_chk check (amount_due >= 0),
  constraint rental_obligations_amount_paid_chk check (amount_paid >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  rental_obligation_id uuid not null references public.rental_obligations(id) on delete restrict,
  tenant_profile_id uuid not null references public.tenant_profiles(id) on delete restrict,
  payment_method public.payment_method not null,
  amount numeric(12,2) not null,
  payment_date date not null,
  verification_status public.payment_verification_status not null default 'pending',
  verified_by uuid references public.users(id) on delete restrict,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payments_amount_positive_chk check (amount > 0),
  constraint payments_verification_consistency_chk check (
    (verification_status = 'pending' and verified_by is null and verified_at is null and rejection_reason is null)
    or (verification_status = 'verified' and verified_by is not null and verified_at is not null and rejection_reason is null)
    or (verification_status = 'rejected' and verified_by is not null and verified_at is not null and rejection_reason is not null)
  )
);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  storage_path text not null,
  original_file_name text,
  mime_type text,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_profile_id uuid not null references public.tenant_profiles(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  room_id uuid references public.rooms(id) on delete restrict,
  bed_space_id uuid references public.bed_spaces(id) on delete restrict,
  category text not null,
  description text not null,
  image_path text,
  status public.maintenance_status not null default 'pending',
  landlord_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  reference_type text,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz,
  constraint notifications_read_consistency_chk check (
    (is_read = false and read_at is null)
    or is_read = true
  )
);

create index users_role_status_idx on public.users(role, account_status);
create index properties_landlord_status_idx on public.properties(landlord_id, status);
create index tenant_profiles_profile_id_idx on public.tenant_profiles(profile_id);
create index tenant_profiles_property_id_idx on public.tenant_profiles(property_id);
create index units_property_category_status_idx on public.units(property_id, unit_category, status);
create index rooms_unit_id_status_idx on public.rooms(unit_id, status);
create index bed_spaces_room_id_status_idx on public.bed_spaces(room_id, status);
create index tenant_assignments_tenant_profile_status_idx on public.tenant_assignments(tenant_profile_id, status);
create index tenant_assignments_unit_status_idx on public.tenant_assignments(unit_id, status);
create index rental_obligations_assignment_due_date_idx on public.rental_obligations(tenant_assignment_id, due_date);
create index rental_obligations_payment_status_idx on public.rental_obligations(payment_status, due_status);
create index payments_obligation_status_idx on public.payments(rental_obligation_id, verification_status);
create index payments_tenant_profile_date_idx on public.payments(tenant_profile_id, payment_date);
create index payment_proofs_payment_id_idx on public.payment_proofs(payment_id);
create index maintenance_requests_tenant_status_idx on public.maintenance_requests(tenant_profile_id, status);
create index maintenance_requests_unit_status_idx on public.maintenance_requests(unit_id, status);
create index notifications_recipient_read_idx on public.notifications(recipient_profile_id, is_read, created_at desc);

create unique index tenant_assignments_one_active_per_tenant_idx
  on public.tenant_assignments(tenant_profile_id)
  where status = 'active';

create unique index tenant_assignments_active_bed_space_idx
  on public.tenant_assignments(bed_space_id)
  where status = 'active' and assignment_type = 'bed_space';

create unique index tenant_assignments_active_room_space_idx
  on public.tenant_assignments(room_id)
  where status = 'active' and assignment_type = 'room_space';

create unique index tenant_assignments_active_apartment_idx
  on public.tenant_assignments(unit_id)
  where status = 'active' and assignment_type = 'apartment';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.users p
  where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.account_status = 'approved'
  );
$$;

create or replace function public.is_landlord()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users p
    where p.id = auth.uid()
      and p.role = 'landlord'
      and p.account_status = 'approved'
  );
$$;

create or replace function public.is_admin_or_landlord()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select public.is_admin()) or (select public.is_landlord());
$$;

create or replace function public.user_owns_property(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.properties pr
    where pr.id = target_property_id
      and pr.landlord_id = auth.uid()
  );
$$;

create or replace function public.user_owns_unit(target_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.units u
    join public.properties pr on pr.id = u.property_id
    where u.id = target_unit_id
      and pr.landlord_id = auth.uid()
  );
$$;

create or replace function public.user_owns_room(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rooms r
    join public.units u on u.id = r.unit_id
    join public.properties pr on pr.id = u.property_id
    where r.id = target_room_id
      and pr.landlord_id = auth.uid()
  );
$$;

create or replace function public.user_owns_bed_space(target_bed_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bed_spaces bs
    join public.rooms r on r.id = bs.room_id
    join public.units u on u.id = r.unit_id
    join public.properties pr on pr.id = u.property_id
    where bs.id = target_bed_space_id
      and pr.landlord_id = auth.uid()
  );
$$;

revoke execute on function public.current_user_role() from public;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_landlord() from public;
revoke execute on function public.is_admin_or_landlord() from public;
revoke execute on function public.user_owns_property(uuid) from public;
revoke execute on function public.user_owns_unit(uuid) from public;
revoke execute on function public.user_owns_room(uuid) from public;
revoke execute on function public.user_owns_bed_space(uuid) from public;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_landlord() to authenticated;
grant execute on function public.is_admin_or_landlord() to authenticated;
grant execute on function public.user_owns_property(uuid) to authenticated;
grant execute on function public.user_owns_unit(uuid) to authenticated;
grant execute on function public.user_owns_room(uuid) to authenticated;
grant execute on function public.user_owns_bed_space(uuid) to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb;
  requested_role text;
  requested_property_id uuid;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role := coalesce(nullif(metadata ->> 'registration_role', ''), 'tenant');

  if requested_role not in ('landlord', 'tenant') then
    requested_role := 'tenant';
  end if;

  if requested_role = 'tenant' and coalesce(nullif(metadata ->> 'property_id', ''), '') <> '' then
    requested_property_id := (metadata ->> 'property_id')::uuid;
  else
    requested_property_id := null;
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
  on conflict (id) do nothing;

  if requested_role = 'tenant' then
    insert into public.tenant_profiles (
      profile_id,
      property_id
    )
    values (
      new.id,
      requested_property_id
    )
    on conflict (profile_id) do update
      set property_id = excluded.property_id;
  end if;

  return new;
end;
$$;

create or replace function public.ensure_property_landlord_role()
returns trigger
language plpgsql
as $$
declare
  profile_role public.user_role;
begin
  select p.role into profile_role
  from public.users p
  where p.id = new.landlord_id;

  if profile_role is distinct from 'landlord' then
    raise exception 'properties can only reference landlord profiles';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_tenant_profile_role()
returns trigger
language plpgsql
as $$
declare
  profile_role public.user_role;
begin
  select p.role into profile_role
  from public.users p
  where p.id = new.profile_id;

  if profile_role is distinct from 'tenant' then
    raise exception 'tenant_profiles can only reference tenant profiles';
  end if;

  return new;
end;
$$;

create or replace function public.validate_room_unit_category()
returns trigger
language plpgsql
as $$
declare
  category public.unit_category;
begin
  select u.unit_category into category
  from public.units u
  where u.id = new.unit_id;

  if category = 'apartment' then
    raise exception 'apartment units cannot have rooms';
  end if;

  return new;
end;
$$;

create or replace function public.validate_bed_space_room_category()
returns trigger
language plpgsql
as $$
declare
  category public.unit_category;
begin
  select u.unit_category into category
  from public.rooms r
  join public.units u on u.id = r.unit_id
  where r.id = new.room_id;

  if category is distinct from 'bed_space' then
    raise exception 'bed spaces are only allowed for bed_space units';
  end if;

  return new;
end;
$$;

create or replace function public.validate_tenant_assignment()
returns trigger
language plpgsql
as $$
declare
  tenant_role public.user_role;
  tenant_status public.account_status;
  unit_cat public.unit_category;
  room_unit_id uuid;
  bed_room_id uuid;
  tenant_property_id uuid;
  unit_property_id uuid;
begin
  select p.role, p.account_status, tp.property_id
  into tenant_role, tenant_status, tenant_property_id
  from public.tenant_profiles tp
  join public.users p on p.id = tp.profile_id
  where tp.id = new.tenant_profile_id;

  if tenant_role is distinct from 'tenant' then
    raise exception 'assignment must reference a tenant profile';
  end if;

  if new.status = 'active' and tenant_status is distinct from 'approved' then
    raise exception 'only approved tenants can receive active assignments';
  end if;

  select property_id, unit_category into unit_property_id, unit_cat
  from public.units
  where id = new.unit_id;

  if unit_cat is null then
    raise exception 'invalid unit';
  end if;

  if tenant_property_id is not null and tenant_property_id is distinct from unit_property_id then
    raise exception 'tenant assignment property must match tenant property';
  end if;

  if unit_cat::text is distinct from new.assignment_type::text then
    raise exception 'assignment_type must match unit category';
  end if;

  if new.room_id is not null then
    select unit_id into room_unit_id
    from public.rooms
    where id = new.room_id;

    if room_unit_id is distinct from new.unit_id then
      raise exception 'room must belong to the selected unit';
    end if;
  end if;

  if new.bed_space_id is not null then
    select room_id into bed_room_id
    from public.bed_spaces
    where id = new.bed_space_id;

    if bed_room_id is distinct from new.room_id then
      raise exception 'bed space must belong to the selected room';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_payment_record()
returns trigger
language plpgsql
as $$
declare
  assignment_tenant_profile_id uuid;
  verifier_role public.user_role;
begin
  select ta.tenant_profile_id
  into assignment_tenant_profile_id
  from public.rental_obligations ro
  join public.tenant_assignments ta on ta.id = ro.tenant_assignment_id
  where ro.id = new.rental_obligation_id;

  if assignment_tenant_profile_id is distinct from new.tenant_profile_id then
    raise exception 'payment tenant must match the rental obligation tenant';
  end if;

  if new.payment_method = 'cash' and new.verification_status = 'pending' then
    raise exception 'cash payments must not remain pending';
  end if;

  if new.verification_status in ('verified', 'rejected') and new.verified_by is not null then
    select role into verifier_role
    from public.users
    where id = new.verified_by;

    if verifier_role is distinct from 'landlord' then
      raise exception 'only landlords can verify or reject payments';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_payment_proof()
returns trigger
language plpgsql
as $$
declare
  payment_method_value public.payment_method;
begin
  select payment_method into payment_method_value
  from public.payments
  where id = new.payment_id;

  if payment_method_value is distinct from 'gcash' then
    raise exception 'payment proofs are only supported for gcash payments';
  end if;

  return new;
end;
$$;

create or replace function public.validate_maintenance_request_location()
returns trigger
language plpgsql
as $$
declare
  assigned_unit_id uuid;
  assigned_room_id uuid;
  assigned_bed_space_id uuid;
begin
  if new.room_id is not null then
    perform 1
    from public.rooms r
    where r.id = new.room_id
      and r.unit_id = new.unit_id;

    if not found then
      raise exception 'room must belong to the selected unit';
    end if;
  end if;

  if new.bed_space_id is not null then
    perform 1
    from public.bed_spaces bs
    join public.rooms r on r.id = bs.room_id
    where bs.id = new.bed_space_id
      and r.id = new.room_id
      and r.unit_id = new.unit_id;

    if not found then
      raise exception 'bed space must belong to the selected room and unit';
    end if;
  end if;

  select ta.unit_id, ta.room_id, ta.bed_space_id
  into assigned_unit_id, assigned_room_id, assigned_bed_space_id
  from public.tenant_assignments ta
  where ta.tenant_profile_id = new.tenant_profile_id
    and ta.status = 'active'
  limit 1;

  if assigned_unit_id is not null then
    if assigned_unit_id is distinct from new.unit_id then
      raise exception 'maintenance request unit must match active assignment';
    end if;

    if coalesce(assigned_room_id, new.room_id) is distinct from coalesce(new.room_id, assigned_room_id) then
      raise exception 'maintenance request room must match active assignment';
    end if;

    if coalesce(assigned_bed_space_id, new.bed_space_id) is distinct from coalesce(new.bed_space_id, assigned_bed_space_id) then
      raise exception 'maintenance request bed space must match active assignment';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.recalculate_rental_obligation_payment_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_obligation_id uuid;
  verified_total numeric(12,2);
  pending_exists boolean;
  rejected_exists boolean;
  obligation_amount_due numeric(12,2);
begin
  target_obligation_id := coalesce(new.rental_obligation_id, old.rental_obligation_id);

  select coalesce(sum(amount), 0)
  into verified_total
  from public.payments
  where rental_obligation_id = target_obligation_id
    and verification_status = 'verified';

  select exists (
    select 1
    from public.payments
    where rental_obligation_id = target_obligation_id
      and verification_status = 'pending'
  )
  into pending_exists;

  select exists (
    select 1
    from public.payments
    where rental_obligation_id = target_obligation_id
      and verification_status = 'rejected'
  )
  into rejected_exists;

  select amount_due into obligation_amount_due
  from public.rental_obligations
  where id = target_obligation_id;

  update public.rental_obligations
  set amount_paid = verified_total,
      payment_status = case
        when verified_total >= obligation_amount_due then 'paid'::public.payment_status
        when verified_total > 0 then 'partially_paid'::public.payment_status
        when pending_exists then 'pending_verification'::public.payment_status
        when rejected_exists then 'rejected'::public.payment_status
        else 'unpaid'::public.payment_status
      end,
      updated_at = timezone('utc', now())
  where id = target_obligation_id;

  return coalesce(new, old);
end;
$$;

create trigger set_users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger set_properties_updated_at before update on public.properties for each row execute function public.set_updated_at();
create trigger set_tenant_profiles_updated_at before update on public.tenant_profiles for each row execute function public.set_updated_at();
create trigger set_units_updated_at before update on public.units for each row execute function public.set_updated_at();
create trigger set_rooms_updated_at before update on public.rooms for each row execute function public.set_updated_at();
create trigger set_bed_spaces_updated_at before update on public.bed_spaces for each row execute function public.set_updated_at();
create trigger set_tenant_assignments_updated_at before update on public.tenant_assignments for each row execute function public.set_updated_at();
create trigger set_rental_obligations_updated_at before update on public.rental_obligations for each row execute function public.set_updated_at();
create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger set_maintenance_requests_updated_at before update on public.maintenance_requests for each row execute function public.set_updated_at();

create trigger trg_handle_new_auth_user after insert on auth.users for each row execute function public.handle_new_auth_user();
create trigger trg_ensure_property_landlord_role before insert or update on public.properties for each row execute function public.ensure_property_landlord_role();
create trigger trg_ensure_tenant_profile_role before insert or update on public.tenant_profiles for each row execute function public.ensure_tenant_profile_role();
create trigger trg_validate_room_unit_category before insert or update on public.rooms for each row execute function public.validate_room_unit_category();
create trigger trg_validate_bed_space_room_category before insert or update on public.bed_spaces for each row execute function public.validate_bed_space_room_category();
create trigger trg_validate_tenant_assignment before insert or update on public.tenant_assignments for each row execute function public.validate_tenant_assignment();
create trigger trg_validate_payment_record before insert or update on public.payments for each row execute function public.validate_payment_record();
create trigger trg_validate_payment_proof before insert or update on public.payment_proofs for each row execute function public.validate_payment_proof();
create trigger trg_validate_maintenance_request_location before insert or update on public.maintenance_requests for each row execute function public.validate_maintenance_request_location();
create trigger trg_recalculate_rental_obligation_payment_status after insert or update or delete on public.payments for each row execute function public.recalculate_rental_obligation_payment_status();

alter table public.users enable row level security;
alter table public.properties enable row level security;
alter table public.tenant_profiles enable row level security;
alter table public.units enable row level security;
alter table public.rooms enable row level security;
alter table public.bed_spaces enable row level security;
alter table public.tenant_assignments enable row level security;
alter table public.rental_obligations enable row level security;
alter table public.payments enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.notifications enable row level security;

revoke all on public.users from anon;
revoke all on public.properties from anon;
revoke all on public.tenant_profiles from anon;
revoke all on public.units from anon;
revoke all on public.rooms from anon;
revoke all on public.bed_spaces from anon;
revoke all on public.tenant_assignments from anon;
revoke all on public.rental_obligations from anon;
revoke all on public.payments from anon;
revoke all on public.payment_proofs from anon;
revoke all on public.maintenance_requests from anon;
revoke all on public.notifications from anon;

grant select, update on public.users to authenticated;
grant select, insert, update on public.properties to authenticated;
grant select, insert, update on public.tenant_profiles to authenticated;
grant select, insert, update on public.units to authenticated;
grant select, insert, update on public.rooms to authenticated;
grant select, insert, update on public.bed_spaces to authenticated;
grant select, insert, update, delete on public.tenant_assignments to authenticated;
grant select, insert, update, delete on public.rental_obligations to authenticated;
grant select, insert, update on public.payments to authenticated;
grant select, insert on public.payment_proofs to authenticated;
grant select, insert, update on public.maintenance_requests to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;

create policy "users_select_self_admin_or_related_landlord"
on public.users for select to authenticated
using (
  id = auth.uid()
  or (select public.is_admin())
  or (
    (select public.is_landlord())
    and exists (
      select 1
      from public.tenant_profiles tp
      join public.properties pr on pr.id = tp.property_id
      where tp.profile_id = users.id
        and pr.landlord_id = auth.uid()
    )
  )
);

create policy "users_update_self_or_admin"
on public.users for update to authenticated
using (id = auth.uid() or (select public.is_admin()))
with check (
  (
    id = auth.uid()
    and role = (select role from public.users where id = auth.uid())
    and account_status = (select account_status from public.users where id = auth.uid())
  )
  or (select public.is_admin())
);

create policy "properties_select_admin_or_owner_or_associated_tenant"
on public.properties for select to authenticated
using (
  (select public.is_admin())
  or landlord_id = auth.uid()
  or exists (
    select 1
    from public.tenant_profiles tp
    where tp.property_id = properties.id
      and tp.profile_id = auth.uid()
  )
);

create policy "properties_insert_admin_or_landlord"
on public.properties for insert to authenticated
with check (
  (select public.is_admin())
  or ((select public.is_landlord()) and landlord_id = auth.uid())
);

create policy "properties_update_admin_or_owner"
on public.properties for update to authenticated
using ((select public.is_admin()) or landlord_id = auth.uid())
with check ((select public.is_admin()) or landlord_id = auth.uid());

create policy "tenant_profiles_select_self_admin_or_property_landlord"
on public.tenant_profiles for select to authenticated
using (
  profile_id = auth.uid()
  or (select public.is_admin())
  or (
    property_id is not null
    and (select public.is_landlord())
    and (select public.user_owns_property(property_id))
  )
);

create policy "tenant_profiles_insert_self_or_admin"
on public.tenant_profiles for insert to authenticated
with check (
  profile_id = auth.uid()
  or (select public.is_admin())
);

create policy "tenant_profiles_update_self_admin_or_property_landlord"
on public.tenant_profiles for update to authenticated
using (
  profile_id = auth.uid()
  or (select public.is_admin())
  or (
    property_id is not null
    and (select public.is_landlord())
    and (select public.user_owns_property(property_id))
  )
)
with check (
  profile_id = auth.uid()
  or (select public.is_admin())
  or (
    property_id is not null
    and (select public.is_landlord())
    and (select public.user_owns_property(property_id))
  )
);

create policy "units_select_admin_or_property_participants"
on public.units for select to authenticated
using (
  (select public.is_admin())
  or (select public.user_owns_property(property_id))
  or exists (
    select 1
    from public.tenant_profiles tp
    where tp.property_id = units.property_id
      and tp.profile_id = auth.uid()
  )
);

create policy "units_manage_admin_or_owner"
on public.units for all to authenticated
using ((select public.is_admin()) or (select public.user_owns_property(property_id)))
with check ((select public.is_admin()) or (select public.user_owns_property(property_id)));

create policy "rooms_select_admin_or_owner_or_property_tenant"
on public.rooms for select to authenticated
using (
  (select public.is_admin())
  or (select public.user_owns_unit(unit_id))
  or exists (
    select 1
    from public.units u
    join public.tenant_profiles tp on tp.property_id = u.property_id
    where u.id = rooms.unit_id
      and tp.profile_id = auth.uid()
  )
);

create policy "rooms_manage_admin_or_owner"
on public.rooms for all to authenticated
using ((select public.is_admin()) or (select public.user_owns_unit(unit_id)))
with check ((select public.is_admin()) or (select public.user_owns_unit(unit_id)));

create policy "bed_spaces_select_admin_or_owner_or_property_tenant"
on public.bed_spaces for select to authenticated
using (
  (select public.is_admin())
  or (select public.user_owns_room(room_id))
  or exists (
    select 1
    from public.rooms r
    join public.units u on u.id = r.unit_id
    join public.tenant_profiles tp on tp.property_id = u.property_id
    where r.id = bed_spaces.room_id
      and tp.profile_id = auth.uid()
  )
);

create policy "bed_spaces_manage_admin_or_owner"
on public.bed_spaces for all to authenticated
using ((select public.is_admin()) or (select public.user_owns_room(room_id)))
with check ((select public.is_admin()) or (select public.user_owns_room(room_id)));

create policy "tenant_assignments_select_self_admin_or_owner"
on public.tenant_assignments for select to authenticated
using (
  exists (
    select 1 from public.tenant_profiles tp
    where tp.id = tenant_assignments.tenant_profile_id
      and tp.profile_id = auth.uid()
  )
  or (select public.is_admin())
  or (select public.user_owns_unit(unit_id))
);

create policy "tenant_assignments_manage_admin_or_owner"
on public.tenant_assignments for all to authenticated
using ((select public.is_admin()) or (select public.user_owns_unit(unit_id)))
with check ((select public.is_admin()) or (select public.user_owns_unit(unit_id)));

create policy "rental_obligations_select_self_admin_or_owner"
on public.rental_obligations for select to authenticated
using (
  exists (
    select 1
    from public.tenant_assignments ta
    join public.tenant_profiles tp on tp.id = ta.tenant_profile_id
    where ta.id = rental_obligations.tenant_assignment_id
      and tp.profile_id = auth.uid()
  )
  or (select public.is_admin())
  or exists (
    select 1
    from public.tenant_assignments ta
    where ta.id = rental_obligations.tenant_assignment_id
      and (select public.user_owns_unit(ta.unit_id))
  )
);

create policy "rental_obligations_manage_admin_or_owner"
on public.rental_obligations for all to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1 from public.tenant_assignments ta
    where ta.id = rental_obligations.tenant_assignment_id
      and (select public.user_owns_unit(ta.unit_id))
  )
)
with check (
  (select public.is_admin())
  or exists (
    select 1 from public.tenant_assignments ta
    where ta.id = rental_obligations.tenant_assignment_id
      and (select public.user_owns_unit(ta.unit_id))
  )
);

create policy "rental_obligations_manage_approved_landlords"
on public.rental_obligations for all to authenticated
using ((select public.is_landlord()))
with check ((select public.is_landlord()));

create policy "payments_select_self_admin_or_owner"
on public.payments for select to authenticated
using (
  exists (
    select 1 from public.tenant_profiles tp
    where tp.id = payments.tenant_profile_id
      and tp.profile_id = auth.uid()
  )
  or (select public.is_admin())
  or exists (
    select 1
    from public.rental_obligations ro
    join public.tenant_assignments ta on ta.id = ro.tenant_assignment_id
    where ro.id = payments.rental_obligation_id
      and (select public.user_owns_unit(ta.unit_id))
  )
);

create policy "payments_insert_self_or_owner"
on public.payments for insert to authenticated
with check (
  (
    exists (
      select 1 from public.tenant_profiles tp
      where tp.id = payments.tenant_profile_id
        and tp.profile_id = auth.uid()
    )
    and payment_method = 'gcash'
    and verification_status = 'pending'
    and verified_by is null
    and verified_at is null
  )
  or (
    (select public.is_landlord())
    and exists (
      select 1
      from public.rental_obligations ro
      join public.tenant_assignments ta on ta.id = ro.tenant_assignment_id
      where ro.id = payments.rental_obligation_id
        and (select public.user_owns_unit(ta.unit_id))
    )
  )
);

create policy "payments_update_self_admin_or_owner"
on public.payments for update to authenticated
using (
  exists (
    select 1 from public.tenant_profiles tp
    where tp.id = payments.tenant_profile_id
      and tp.profile_id = auth.uid()
  )
  or (select public.is_admin())
  or exists (
    select 1
    from public.rental_obligations ro
    join public.tenant_assignments ta on ta.id = ro.tenant_assignment_id
    where ro.id = payments.rental_obligation_id
      and (select public.user_owns_unit(ta.unit_id))
  )
)
with check (
  (
    exists (
      select 1 from public.tenant_profiles tp
      where tp.id = payments.tenant_profile_id
        and tp.profile_id = auth.uid()
    )
    and payment_method = 'gcash'
    and verification_status = 'pending'
    and verified_by is null
    and verified_at is null
  )
  or (select public.is_admin())
  or exists (
    select 1
    from public.rental_obligations ro
    join public.tenant_assignments ta on ta.id = ro.tenant_assignment_id
    where ro.id = payments.rental_obligation_id
      and (select public.user_owns_unit(ta.unit_id))
  )
);

create policy "payment_proofs_select_self_admin_or_owner"
on public.payment_proofs for select to authenticated
using (
  exists (
    select 1
    from public.payments p
    join public.tenant_profiles tp on tp.id = p.tenant_profile_id
    where p.id = payment_proofs.payment_id
      and tp.profile_id = auth.uid()
  )
  or (select public.is_admin())
  or exists (
    select 1
    from public.payments p
    join public.rental_obligations ro on ro.id = p.rental_obligation_id
    join public.tenant_assignments ta on ta.id = ro.tenant_assignment_id
    where p.id = payment_proofs.payment_id
      and (select public.user_owns_unit(ta.unit_id))
  )
);

create policy "payment_proofs_insert_self"
on public.payment_proofs for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.payments p
    join public.tenant_profiles tp on tp.id = p.tenant_profile_id
    where p.id = payment_proofs.payment_id
      and tp.profile_id = auth.uid()
      and p.payment_method = 'gcash'
  )
);

create policy "maintenance_requests_select_self_admin_or_owner"
on public.maintenance_requests for select to authenticated
using (
  exists (
    select 1
    from public.tenant_profiles tp
    where tp.id = maintenance_requests.tenant_profile_id
      and tp.profile_id = auth.uid()
  )
  or (select public.is_admin())
  or (select public.user_owns_unit(unit_id))
);

create policy "maintenance_requests_insert_self"
on public.maintenance_requests for insert to authenticated
with check (
  exists (
    select 1
    from public.tenant_profiles tp
    where tp.id = maintenance_requests.tenant_profile_id
      and tp.profile_id = auth.uid()
  )
);

create policy "maintenance_requests_update_self_admin_or_owner"
on public.maintenance_requests for update to authenticated
using (
  exists (
    select 1
    from public.tenant_profiles tp
    where tp.id = maintenance_requests.tenant_profile_id
      and tp.profile_id = auth.uid()
  )
  or (select public.is_admin())
  or (select public.user_owns_unit(unit_id))
)
with check (
  exists (
    select 1
    from public.tenant_profiles tp
    where tp.id = maintenance_requests.tenant_profile_id
      and tp.profile_id = auth.uid()
  )
  or (select public.is_admin())
  or (select public.user_owns_unit(unit_id))
);

create policy "notifications_select_self_admin_or_related_landlord"
on public.notifications for select to authenticated
using (
  recipient_profile_id = auth.uid()
  or (select public.is_admin())
  or (
    (select public.is_landlord())
    and exists (
      select 1
      from public.tenant_profiles tp
      join public.properties pr on pr.id = tp.property_id
      where tp.profile_id = notifications.recipient_profile_id
        and pr.landlord_id = auth.uid()
    )
  )
);

create policy "notifications_update_self_or_admin"
on public.notifications for update to authenticated
using (recipient_profile_id = auth.uid() or (select public.is_admin()))
with check (recipient_profile_id = auth.uid() or (select public.is_admin()));

create policy "notifications_insert_admin_or_landlord"
on public.notifications for insert to authenticated
with check (
  (select public.is_admin())
  or (
    (select public.is_landlord())
    and exists (
      select 1
      from public.tenant_profiles tp
      join public.properties pr on pr.id = tp.property_id
      where tp.profile_id = notifications.recipient_profile_id
        and pr.landlord_id = auth.uid()
    )
  )
);

create policy "notifications_delete_admin"
on public.notifications for delete to authenticated
using ((select public.is_admin()));