import { FilterNavigation } from "@/components/ui/filter-navigation";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { requireAdminAccess } from "@/lib/auth/utils";
import type { Profile } from "@/lib/auth/types";
import { createClient } from "@/utils/supabase/server";
import { UserAccountControls } from "@/components/admin/user-account-controls";
import { ListSearchForm } from "@/components/ui/list-search-form";

export const metadata = { title: "Manage User Accounts | RentSpace" };

type UsersPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function statusTone(status: Profile["account_status"]) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  if (status === "rejected") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function statusLabel(user: Profile) {
  if (user.account_status === "approved") return user.role === "tenant" ? "Approved by Landlord" : "Approved by Admin";
  if (user.account_status === "pending") return user.role === "tenant" ? "Pending Landlord Approval" : "Pending Admin Approval";
  return user.account_status;
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  await requireAdminAccess();
  const [params, supabase] = await Promise.all([searchParams, createClient()]);
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, middle_name, last_name, mobile_number, email, role, account_status, profile_photo_url, created_at, updated_at")
    .in("role", ["landlord", "tenant"])
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load registered user accounts.");

  const users = (data ?? []) as Profile[];
  const tenantUserIds = users.filter((user) => user.role === "tenant").map((user) => user.id);
  const tenantProfilesResult = tenantUserIds.length
    ? await supabase.from("tenant_profiles").select("id, profile_id").in("profile_id", tenantUserIds)
    : { data: [], error: null };
  if (tenantProfilesResult.error) throw new Error("Unable to load Tenant assignment information.");
  const tenantProfiles = tenantProfilesResult.data ?? [];
  const assignmentsResult = tenantProfiles.length
    ? await supabase.from("tenant_assignments").select("tenant_profile_id, assignment_type, unit_id, room_id, bed_space_id, status").in("tenant_profile_id", tenantProfiles.map((item) => item.id))
    : { data: [], error: null };
  if (assignmentsResult.error) throw new Error("Unable to load Tenant assignment information.");
  const assignmentRows = assignmentsResult.data ?? [];
  const activeAssignments = assignmentRows.filter((assignment) => assignment.status === "active");
  const unitIds = [...new Set(activeAssignments.map((assignment) => assignment.unit_id))];
  const roomIds = [...new Set(activeAssignments.flatMap((assignment) => assignment.room_id ? [assignment.room_id] : []))];
  const bedSpaceIds = [...new Set(activeAssignments.flatMap((assignment) => assignment.bed_space_id ? [assignment.bed_space_id] : []))];
  const [unitsResult, roomsResult, bedSpacesResult] = await Promise.all([
    unitIds.length ? supabase.from("units").select("id, unit_name").in("id", unitIds) : Promise.resolve({ data: [], error: null }),
    roomIds.length ? supabase.from("rooms").select("id, room_number").in("id", roomIds) : Promise.resolve({ data: [], error: null }),
    bedSpaceIds.length ? supabase.from("bed_spaces").select("id, bed_label").in("id", bedSpaceIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (unitsResult.error || roomsResult.error || bedSpacesResult.error) throw new Error("Unable to load Tenant assignment locations.");
  const tenantProfileByUser = new Map(tenantProfiles.map((item) => [item.profile_id, item.id]));
  const tenantProfilesWithHistory = new Set(assignmentRows.map((item) => item.tenant_profile_id));
  const unitNames = new Map((unitsResult.data ?? []).map((unit) => [unit.id, unit.unit_name]));
  const roomNames = new Map((roomsResult.data ?? []).map((room) => [room.id, room.room_number]));
  const bedSpaceNames = new Map((bedSpacesResult.data ?? []).map((bedSpace) => [bedSpace.id, bedSpace.bed_label]));
  const assignmentByTenantProfile = new Map(activeAssignments.map((assignment) => [assignment.tenant_profile_id, assignment]));
  const requestedFilter = typeof params.filter === "string" ? params.filter : "all";
  const selectedFilter = ["all", "tenant", "landlord", "pending", "approved", "rejected", "inactive"].includes(requestedFilter) ? requestedFilter : "all";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const normalizedQuery = query.toLocaleLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesFilter = selectedFilter === "all" || user.role === selectedFilter || user.account_status === selectedFilter;
    const searchable = [user.first_name, user.middle_name, user.last_name, user.email].filter(Boolean).join(" ").toLocaleLowerCase();
    return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
  const searchSuggestions = Array.from(new Set(users.flatMap((user) => {
    const name = `${user.first_name} ${user.middle_name ?? ""} ${user.last_name}`.replace(/\s+/g, " ").trim();
    return [name, user.email].filter((value): value is string => Boolean(value));
  })));

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Administration</p>
        <h1 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">Manage User Accounts</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-dormmate-muted)]">View registered Tenant and Landlord accounts, contact details, roles, registration dates, and current approval statuses.</p>
      </section>

      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <ListSearchForm basePath="/admin/users" query={query} selectedFilter={selectedFilter} label="Search user accounts" placeholder="Search name or email" suggestions={searchSuggestions} />
        <div className="mt-4">
        <FilterNavigation
          basePath="/admin/users"
          selected={selectedFilter}
          preservedParams={query ? { q: query } : {}}
          label="Filter user accounts"
          options={[
            { value: "all", label: "All", count: users.length },
            { value: "tenant", label: "Tenants", count: users.filter((user) => user.role === "tenant").length },
            { value: "landlord", label: "Landlords", count: users.filter((user) => user.role === "landlord").length },
            { value: "pending", label: "Pending", count: users.filter((user) => user.account_status === "pending").length },
            { value: "approved", label: "Approved", count: users.filter((user) => user.account_status === "approved").length },
            { value: "rejected", label: "Rejected", count: users.filter((user) => user.account_status === "rejected").length },
            { value: "inactive", label: "Inactive", count: users.filter((user) => user.account_status === "inactive").length },
          ]}
        />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] p-5 text-sm text-[var(--color-dormmate-muted)]">No registered accounts match this filter.</div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-[1.15rem] border border-[var(--color-dormmate-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-dormmate-surface)] text-xs uppercase tracking-wide text-[var(--color-dormmate-muted)]">
                <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Registered</th><th className="px-4 py-3">Account Actions</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const name = `${user.first_name} ${user.middle_name ?? ""} ${user.last_name}`.replace(/\s+/g, " ").trim();
                  const tenantProfileId = tenantProfileByUser.get(user.id);
                  const canRemove = user.role === "tenant" && (!tenantProfileId || !tenantProfilesWithHistory.has(tenantProfileId));
                  const assignment = tenantProfileId ? assignmentByTenantProfile.get(tenantProfileId) : null;
                  const unitName = assignment ? unitNames.get(assignment.unit_id) ?? "Unit" : null;
                  const assignmentLabel = user.role !== "tenant"
                    ? "Landlord account"
                    : !assignment || !unitName
                      ? "No current assignment"
                      : assignment.assignment_type === "apartment"
                        ? unitName
                        : assignment.assignment_type === "room_space"
                          ? `${unitName} • Room: ${roomNames.get(assignment.room_id ?? "") ?? "—"}`
                          : `${unitName} • Room: ${roomNames.get(assignment.room_id ?? "") ?? "—"} • ${bedSpaceNames.get(assignment.bed_space_id ?? "") ?? "Bed space"}`;
                  return (
                    <tr key={user.id} className="border-t border-[var(--color-dormmate-border)] align-middle">
                      <td className="px-4 py-4"><div className="flex items-center gap-3"><ProfileAvatar photoUrl={user.profile_photo_url} name={name} assignmentLabel={assignmentLabel} assignmentPrefix={user.role === "tenant" ? "Assigned to" : "Account"} /><div><p className="font-semibold text-[var(--color-dormmate-text-strong)]">{name}</p><p className="text-xs text-[var(--color-dormmate-muted)]">{user.email ?? "No email"}</p></div></div></td>
                      <td className="px-4 py-4 capitalize">{user.role}</td>
                      <td className="px-4 py-4 text-[var(--color-dormmate-muted)]">{user.mobile_number}</td>
                      <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(user.account_status)}`}>{statusLabel(user)}</span></td>
                      <td className="px-4 py-4 text-[var(--color-dormmate-muted)]">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-4"><UserAccountControls profileId={user.id} name={name} role={user.role} accountStatus={user.account_status} canRemove={canRemove} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}