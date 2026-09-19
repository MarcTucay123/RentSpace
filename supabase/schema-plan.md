# DormMate Initial Schema Plan

## 1. `profiles`
- **Purpose:** Main application profile record linked 1-to-1 with `auth.users`.
- **Relationships:** `profiles.id -> auth.users.id`.
- **Key constraints:** role enum (`admin`, `landlord`, `tenant`), account status enum, email unique when present, one row per auth user.

## 2. `properties`
- **Purpose:** Property/business ownership layer that lets each landlord own one or more properties.
- **Relationships:** `properties.landlord_id -> profiles.id`.
- **Key constraints:** only landlord profiles can own properties, property status enum.

## 3. `tenant_profiles`
- **Purpose:** Tenant-only profile details separated from general account info.
- **Relationships:** `tenant_profiles.profile_id -> profiles.id` (unique), optional `property_id -> properties.id`.
- **Key constraints:** one tenant profile per tenant profile row owner, tenant/property association supports landlord-scoped tenant approval.

## 4. `units`
- **Purpose:** Shared top-level rental structure for bed-space, room-space, and apartment categories.
- **Relationships:** `units.property_id -> properties.id`, parent for rooms and assignments.
- **Key constraints:** category enum, status enum.

## 5. `rooms`
- **Purpose:** Optional intermediate structure under units for bed-space and room-space categories.
- **Relationships:** `rooms.unit_id -> units.id`.
- **Key constraints:** unique `(unit_id, room_number)`, apartment units should not use rooms (enforced by trigger).

## 6. `bed_spaces`
- **Purpose:** Lowest-level assignable structure for bed-space rentals.
- **Relationships:** `bed_spaces.room_id -> rooms.id`.
- **Key constraints:** unique `(room_id, bed_label)`, room must belong to a `bed_space` unit category (trigger-enforced).

## 7. `tenant_assignments`
- **Purpose:** Tracks where a tenant is assigned across all rental categories.
- **Relationships:** references tenant profile, unit, optional room, optional bed space.
- **Key constraints:** assignment type enum, status enum, structure rules by type, one active assignment per tenant, and no double-booking of active bed space / room-space room / apartment unit.

## 8. `rental_obligations`
- **Purpose:** Expected charges per rental period tied to an assignment.
- **Relationships:** `rental_obligations.tenant_assignment_id -> tenant_assignments.id`.
- **Key constraints:** date ordering, nonnegative amounts, due status enum, payment status enum.

## 9. `payments`
- **Purpose:** Payment records for obligations, including landlord-recorded cash and tenant-submitted GCash.
- **Relationships:** obligation, tenant profile, optional verifier profile.
- **Key constraints:** payment method enum, verification status enum, amount > 0, verifier required for verified payments.

## 10. `payment_proofs`
- **Purpose:** File references for uploaded receipts/proofs stored in Supabase Storage.
- **Relationships:** `payment_proofs.payment_id -> payments.id`, `uploaded_by -> profiles.id`.
- **Key constraints:** store only file path/metadata, preserve historical proofs.

## 11. `maintenance_requests`
- **Purpose:** Tenant-submitted maintenance concerns for assigned rental locations.
- **Relationships:** tenant profile, unit, optional room, optional bed space.
- **Key constraints:** status enum, preserve history, optional image path.

## 12. `notifications`
- **Purpose:** User-targeted notifications for approvals, due dates, payment actions, and maintenance updates.
- **Relationships:** `recipient_profile_id -> profiles.id`.
- **Key constraints:** read flag and read timestamp consistency.

## 13. Helper functions / triggers
- `set_updated_at()` for timestamp maintenance.
- `is_admin()`, `is_landlord()`, ownership helpers, and `current_profile_id()` for RLS logic.
- Trigger to auto-create a default `profiles` row for new auth users as `landlord/pending` or `tenant/pending` based on controlled registration metadata.
- Trigger(s) to enforce category-aware room/bed-space/assignment rules.
- Trigger(s) to restrict active assignment to approved tenant accounts.

## 14. RLS approach
- **Tenant:** can read/update only their own permitted records; can insert their own GCash payments, payment proofs, maintenance requests; cannot manage master data.
- **Landlord:** can only manage records belonging to owned properties.
- **Admin:** system-level oversight for admin/landlord/property governance, without depending on user-editable metadata.
- **Public access:** disabled; only explicit grants/policies for `authenticated`.

## 15. Business logic split
- **Database-enforced:** foreign keys, enums, uniqueness, status guards, assignment exclusivity, approved-tenant assignment rule, property ownership derivation, auto profile creation.
- **Application/server-side:** first admin provisioning, create/manage additional admins, guarantee at least one active admin, approval workflow UI, notification generation timing, due status recalculation scheduling, aggregate dashboard queries, password changes via Supabase Auth.