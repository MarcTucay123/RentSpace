-- Publish operational tables used by the shared portal auto-refresh listener.
-- Existing RLS policies continue to determine which changes each signed-in
-- Admin, Landlord, or Tenant is authorized to receive.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'tenant_profiles',
    'units',
    'rooms',
    'bed_spaces',
    'tenant_assignments',
    'rental_obligations',
    'payments',
    'payment_proofs',
    'maintenance_requests',
    'maintenance_attachments',
    'notifications',
    'messages'
  ] loop
    if to_regclass('public.' || table_name) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = table_name
       ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;