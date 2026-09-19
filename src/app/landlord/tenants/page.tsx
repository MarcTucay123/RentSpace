import { requireLandlordAccess } from "@/lib/auth/utils";
import { getLandlordTenants } from "@/lib/landlord/data";
import { getUnitsWithStructure } from "@/lib/units/data";
import { getUnitCategoryLabel } from "@/lib/units/types";
import { TenantAssignmentForm, type RentalSpaceOption } from "@/components/landlord/tenant-assignment-form";
import { TenantAssignmentEditForm } from "@/components/landlord/tenant-assignment-edit-form";
import { TenantMoveOutButton } from "@/components/landlord/tenant-move-out-button";
import { FilterNavigation } from "@/components/ui/filter-navigation";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ListSearchForm } from "@/components/ui/list-search-form";

export const metadata = {
  title: "Tenants | RentSpace",
};

function formatAssignmentLocation(tenant: Awaited<ReturnType<typeof getLandlordTenants>>[number]) {
  if (!tenant.assignmentType || !tenant.unitName) {
    return "No active assignment";
  }

  if (tenant.assignmentType === "apartment") {
    return tenant.unitName;
  }

  if (tenant.assignmentType === "room_space") {
    return `${tenant.unitName} • Room: ${tenant.roomNumber ?? "—"}`;
  }

  return `${tenant.unitName} • Room: ${tenant.roomNumber ?? "—"} • ${tenant.bedLabel ?? "No bed label"}`;
}

function getAssignmentOption(tenant: Awaited<ReturnType<typeof getLandlordTenants>>[number], units: Awaited<ReturnType<typeof getUnitsWithStructure>>): RentalSpaceOption | null {
  if (!tenant.assignmentType || !tenant.unitId) return null;
  const unit = units.find((item) => item.id === tenant.unitId);
  const rentalRate = tenant.assignmentType === "bed_space"
    ? unit?.bed_spaces.find((bed) => bed.id === tenant.bedSpaceId)?.rental_rate ?? null
    : tenant.assignmentType === "room_space"
      ? unit?.rooms.find((room) => room.id === tenant.roomId)?.rental_rate ?? null
      : unit?.rental_rate ?? null;
  return {
    value: `${tenant.assignmentType}:${tenant.unitId}:${tenant.roomId ?? ""}:${tenant.bedSpaceId ?? ""}`,
    label: formatAssignmentLocation(tenant),
    rentalRate,
  };
}

type TenantsPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LandlordTenantsPage({ searchParams }: TenantsPageProps) {
  await requireLandlordAccess();
  const [tenants, units, params] = await Promise.all([getLandlordTenants(), getUnitsWithStructure(), searchParams]);

  const rentalSpaceOptions = units
    .filter((unit) => unit.status === "active")
    .flatMap<RentalSpaceOption>((unit) => {
      if (unit.unit_category === "apartment") {
        return unit.apartment_is_occupied
          ? []
          : [{ value: `apartment:${unit.id}::`, label: `${unit.unit_name} · ${getUnitCategoryLabel(unit.unit_category)}`, rentalRate: unit.rental_rate }];
      }

      if (unit.unit_category === "room_space") {
        return unit.rooms
          .filter((room) => room.status === "active" && !unit.occupied_room_ids.includes(room.id))
          .map((room) => ({
            value: `room_space:${unit.id}:${room.id}:`,
            label: `${unit.unit_name} · Room: ${room.room_number}`,
            rentalRate: room.rental_rate,
          }));
      }

      return unit.bed_spaces
        .filter((bed) => bed.status !== "inactive" && !unit.occupied_bed_space_ids.includes(bed.id))
        .map((bed) => {
          const room = unit.rooms.find((item) => item.id === bed.room_id);
          return {
            value: `bed_space:${unit.id}:${bed.room_id}:${bed.id}`,
            label: `${unit.unit_name} · Room: ${room?.room_number ?? "—"} · ${bed.bed_label}`,
            rentalRate: bed.rental_rate,
          };
        });
    });

  const defaultStartDate = new Date().toISOString().slice(0, 10);

  const approvedCount = tenants.filter((tenant) => tenant.accountStatus === "approved").length;
  const assignedCount = tenants.filter((tenant) => tenant.assignmentType !== null).length;
  const pendingCount = tenants.filter((tenant) => tenant.accountStatus === "pending").length;
  const requestedFilter = typeof params.filter === "string" ? params.filter : "all";
  const selectedFilter = ["all", "approved", "assigned", "pending"].includes(requestedFilter) ? requestedFilter : "all";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const normalizedQuery = query.toLocaleLowerCase();
  const filteredTenants = tenants.filter((tenant) => {
    const matchesFilter = selectedFilter === "approved"
      ? tenant.accountStatus === "approved"
      : selectedFilter === "assigned"
        ? tenant.assignmentType !== null
        : selectedFilter === "pending"
          ? tenant.accountStatus === "pending"
          : true;
    const searchable = [tenant.firstName, tenant.middleName, tenant.lastName].filter(Boolean).join(" ").toLocaleLowerCase();
    return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
  const searchSuggestions = Array.from(new Set(tenants.flatMap((tenant) => {
    const name = `${tenant.firstName} ${tenant.middleName ?? ""} ${tenant.lastName}`.replace(/\s+/g, " ").trim();
    return [name];
  })));

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Tenants</p>
        <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">Tenant directory</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-dormmate-muted)]">
          Review approved tenants, account states, active room or bed assignments, and move-in details in a compact landlord view.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
        {[
          { label: "Approved", value: approvedCount, tone: "bg-[#f0f1ee] text-[#1b263b]" },
          { label: "With Assignment", value: assignedCount, tone: "bg-[#e0e1dd] text-[#415a77]" },
          { label: "Pending", value: pendingCount, tone: "bg-[#fff8e7] text-[#c08a26]" },
        ].map((stat) => (
          <article key={stat.label} className="min-w-0 rounded-[1rem] bg-white p-3 shadow-[var(--shadow)] sm:rounded-[1.15rem] sm:p-4">
            <p className="truncate text-xs text-[var(--color-dormmate-muted)] sm:text-sm">{stat.label}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2 sm:mt-2"><p className="text-xl font-semibold text-[var(--color-dormmate-text-strong)] sm:text-[1.6rem]">{stat.value}</p><span className={`truncate rounded-full px-2 py-1 text-[10px] font-semibold sm:px-2.5 sm:text-xs ${stat.tone}`}>{stat.label}</span></div>
          </article>
        ))}
      </section>

      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <ListSearchForm basePath="/landlord/tenants" query={query} selectedFilter={selectedFilter} label="Search tenants" placeholder="Search tenant name" suggestions={searchSuggestions} />
        <div className="mt-4">
        <FilterNavigation
          basePath="/landlord/tenants"
          selected={selectedFilter}
          preservedParams={query ? { q: query } : {}}
          label="Filter Tenants"
          options={[
            { value: "all", label: "All", count: tenants.length },
            { value: "approved", label: "Approved", count: approvedCount },
            { value: "assigned", label: "With Assignment", count: assignedCount },
            { value: "pending", label: "Pending", count: pendingCount },
          ]}
        />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Current list</p>
            <h3 className="mt-2 text-[1.35rem] font-semibold text-[var(--color-dormmate-text-strong)]">Approved and pending tenants</h3>
          </div>
          <span className="text-sm text-[var(--color-dormmate-muted)]">{filteredTenants.length} tenant{filteredTenants.length === 1 ? "" : "s"}</span>
        </div>

        {filteredTenants.length === 0 ? (
          <div className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] p-5 text-sm text-[var(--color-dormmate-muted)]">
            No Tenants match this filter.
          </div>
        ) : (
          <div className="mt-5 max-w-full overflow-x-auto rounded-[1.15rem] border border-[var(--color-dormmate-border)]">
            <table className="w-full min-w-[1100px] table-fixed border-collapse text-left text-xs xl:text-sm">
              <colgroup>
                <col className="w-[4%]" />
                <col className="w-[10%]" />
                <col className="w-[16%]" />
                <col className="w-[11%]" />
                <col className="w-[15%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="bg-[var(--color-dormmate-surface)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-dormmate-muted)]">
                <tr>
                  <th className="px-2 py-4 xl:px-3">#</th>
                  <th className="px-2 py-4 xl:px-3">Name</th>
                  <th className="px-2 py-4 xl:px-3">Email</th>
                  <th className="px-2 py-4 xl:px-3">Phone</th>
                  <th className="px-2 py-4 xl:px-3">Assigned To</th>
                  <th className="px-2 py-4 xl:px-3">Monthly Rent</th>
                  <th className="px-2 py-4 xl:px-3">Move-in / Due</th>
                  <th className="px-2 py-4 xl:px-3">Status</th>
                  <th className="px-2 py-4 xl:px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant, index) => {
                  const assignmentOption = getAssignmentOption(tenant, units);
                  const tenantName = `${tenant.firstName} ${tenant.lastName}`.trim();
                  return (
                    <tr key={tenant.tenantProfileId} className="border-t border-[var(--color-dormmate-border)] align-top transition hover:bg-[#f8f8f6]">
                      <td className="px-2 py-5 font-semibold text-[var(--color-dormmate-text-strong)] xl:px-3">{index + 1}</td>
                      <td className="break-words px-2 py-5 font-semibold text-[var(--color-dormmate-text-strong)] xl:px-3">
                        <div className="flex items-center gap-2.5"><ProfileAvatar photoUrl={tenant.profilePhotoUrl} name={tenantName} assignmentLabel={formatAssignmentLocation(tenant)} className="h-9 w-9" /><span>{tenantName}</span></div>
                      </td>
                      <td className="break-all px-2 py-5 text-[var(--color-dormmate-muted)] xl:px-3">{tenant.email ?? "—"}</td>
                      <td className="break-words px-2 py-5 text-[var(--color-dormmate-muted)] xl:px-3">{tenant.mobileNumber || "—"}</td>
                      <td className="break-words px-2 py-5 font-bold text-[var(--color-dormmate-text-strong)] xl:px-3">{formatAssignmentLocation(tenant)}</td>
                      <td className="break-words px-2 py-5 font-semibold text-[#b87417] xl:px-3">{tenant.monthlyRent === null ? "Not set" : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(tenant.monthlyRent)}</td>
                      <td className="px-2 py-5 text-[var(--color-dormmate-muted)] xl:px-3">
                        <p>{tenant.moveInDate ? new Date(`${tenant.moveInDate}T00:00:00`).toLocaleDateString() : "Not set"}</p>
                        <p className="mt-1 text-xs font-bold text-[var(--color-dormmate-text-strong)]">Due: {tenant.rentDueDate ? new Date(`${tenant.rentDueDate}T00:00:00`).toLocaleDateString() : "Not set"}</p>
                      </td>
                      <td className="px-2 py-5 xl:px-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tenant.accountStatus === "approved" ? "bg-[#f0f1ee] text-[#1b263b]" : tenant.accountStatus === "pending" ? "bg-[#fff8e7] text-[#c08a26]" : "bg-[#fbe9e5] text-[#cf6a4b]"}`}>{tenant.accountStatus}</span>
                      </td>
                      <td className="px-2 py-5 xl:px-3">
                        <div className="flex w-full min-w-0 max-w-[160px] flex-col items-stretch gap-2">
                          {tenant.assignmentId && tenant.moveInDate && assignmentOption ? <TenantAssignmentEditForm assignmentId={tenant.assignmentId} tenantName={tenantName} options={rentalSpaceOptions} currentOption={assignmentOption} moveInDate={tenant.moveInDate} rentDueDate={tenant.rentDueDate} monthlyRent={tenant.monthlyRent} /> : null}
                          {tenant.assignmentId ? <TenantMoveOutButton assignmentId={tenant.assignmentId} tenantName={tenantName} /> : null}
                          {tenant.accountStatus === "approved" && tenant.assignmentType === null ? <TenantAssignmentForm tenantProfileId={tenant.tenantProfileId} tenantName={tenantName} options={rentalSpaceOptions} defaultStartDate={defaultStartDate} /> : null}
                        </div>
                      </td>
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