create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint messages_different_participants_chk check (sender_profile_id <> recipient_profile_id),
  constraint messages_body_length_chk check (char_length(trim(body)) between 1 and 2000),
  constraint messages_read_consistency_chk check (
    (is_read = false and read_at is null)
    or (is_read = true and read_at is not null)
  )
);

create index if not exists messages_sender_created_idx
  on public.messages(sender_profile_id, created_at desc);

create index if not exists messages_recipient_read_created_idx
  on public.messages(recipient_profile_id, is_read, created_at desc);

alter table public.messages enable row level security;

revoke all on public.messages from anon;
revoke all on public.messages from authenticated;
grant select, insert on public.messages to authenticated;
grant update (is_read, read_at) on public.messages to authenticated;

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
on public.messages for select to authenticated
using (sender_profile_id = auth.uid() or recipient_profile_id = auth.uid());

drop policy if exists "messages_insert_approved_cross_role" on public.messages;
create policy "messages_insert_approved_cross_role"
on public.messages for insert to authenticated
with check (
  sender_profile_id = auth.uid()
  and is_read = false
  and read_at is null
  and exists (
    select 1
    from public.profiles as sender
    join public.profiles as recipient on recipient.id = recipient_profile_id
    where sender.id = auth.uid()
      and sender.account_status = 'approved'
      and recipient.account_status = 'approved'
      and (
        (sender.role = 'landlord' and recipient.role = 'tenant')
        or (sender.role = 'tenant' and recipient.role = 'landlord')
      )
  )
);

drop policy if exists "messages_recipient_mark_read" on public.messages;
create policy "messages_recipient_mark_read"
on public.messages for update to authenticated
using (recipient_profile_id = auth.uid())
with check (
  recipient_profile_id = auth.uid()
  and sender_profile_id <> auth.uid()
  and is_read = true
  and read_at is not null
);

create or replace function public.is_approved_tenant()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'tenant'
      and p.account_status = 'approved'
  );
$$;

revoke all on function public.is_approved_tenant() from public, anon;
grant execute on function public.is_approved_tenant() to authenticated;

drop policy if exists "profiles_select_approved_landlords_for_tenants" on public.profiles;
create policy "profiles_select_approved_landlords_for_tenants"
on public.profiles for select to authenticated
using (
  role = 'landlord'
  and account_status = 'approved'
  and (select public.is_approved_tenant())
);

create or replace function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_name text;
begin
  select trim(p.first_name || ' ' || p.last_name)
  into sender_name
  from public.profiles as p
  where p.id = new.sender_profile_id;

  insert into public.notifications (
    recipient_profile_id,
    notification_type,
    title,
    message,
    reference_type,
    reference_id
  )
  values (
    new.recipient_profile_id,
    'new_message',
    'New message from ' || coalesce(sender_name, 'RentSpace user'),
    left(new.body, 240),
    'message',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists notify_message_recipient on public.messages;
create trigger notify_message_recipient
after insert on public.messages
for each row execute function public.notify_message_recipient();

notify pgrst, 'reload schema';