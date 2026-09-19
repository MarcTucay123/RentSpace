import { requireLandlordAccess } from "@/lib/auth/utils";
import { getLandlordMaintenanceRequests } from "@/lib/landlord/data";
import { FilterNavigation } from "@/components/ui/filter-navigation";
import { MaintenanceStatusForm } from "@/components/landlord/maintenance-status-form";

export const metadata = {
  title: "Maintenance | RentSpace",
};

function getStatusTone(status: string) {
  if (status === "resolved") return "bg-[#f0f1ee] text-[#1b263b]";
  if (status === "in_progress") return "bg-[#e0e1dd] text-[#415a77]";
  if (status === "acknowledged") return "bg-[#f5f6f4] text-[#415a77]";
  return "bg-[#fff8e7] text-[#c08a26]";
}

function formatLocation(item: Awaited<ReturnType<typeof getLandlordMaintenanceRequests>>[number]) {
  const parts = [item.unitName, item.roomNumber ? `Room: ${item.roomNumber}` : null, item.bedLabel].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : "Location unavailable";
}

type MaintenancePageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LandlordMaintenancePage({ searchParams }: MaintenancePageProps) {
  await requireLandlordAccess();
  const [requests, params] = await Promise.all([getLandlordMaintenanceRequests(), searchParams]);

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const activeCount = requests.filter((request) => request.status === "acknowledged" || request.status === "in_progress").length;
  const resolvedCount = requests.filter((request) => request.status === "resolved").length;
  const requestedFilter = typeof params.filter === "string" ? params.filter : "all";
  const selectedFilter = ["all", "pending", "active", "resolved"].includes(requestedFilter) ? requestedFilter : "all";
  const filteredRequests = requests.filter((request) => {
    if (selectedFilter === "active") return request.status === "acknowledged" || request.status === "in_progress";
    if (selectedFilter !== "all") return request.status === selectedFilter;
    return true;
  });

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Maintenance</p>
        <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">Maintenance requests</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-dormmate-muted)]">
          Review tenant-submitted concerns, request locations, current statuses, and landlord notes in a compact operations view.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
        {[
          { label: "Pending", value: pendingCount, tone: "bg-[#fff8e7] text-[#c08a26]" },
          { label: "Active", value: activeCount, tone: "bg-[#e0e1dd] text-[#415a77]" },
          { label: "Resolved", value: resolvedCount, tone: "bg-[#f0f1ee] text-[#1b263b]" },
        ].map((stat) => (
          <article key={stat.label} className="min-w-0 rounded-[1rem] bg-white p-3 shadow-[var(--shadow)] sm:rounded-[1.15rem] sm:p-4">
            <p className="truncate text-xs text-[var(--color-dormmate-muted)] sm:text-sm">{stat.label}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2 sm:mt-2 sm:gap-3">
              <p className="text-xl font-semibold text-[var(--color-dormmate-text-strong)] sm:text-[1.6rem]">{stat.value}</p>
              <span className={`truncate rounded-full px-2 py-1 text-[10px] font-semibold sm:px-2.5 sm:text-xs ${stat.tone}`}>{stat.label}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <FilterNavigation
          basePath="/landlord/maintenance"
          selected={selectedFilter}
          label="Filter Maintenance Requests"
          options={[
            { value: "all", label: "All", count: requests.length },
            { value: "pending", label: "Pending", count: pendingCount },
            { value: "active", label: "Active", count: activeCount },
            { value: "resolved", label: "Resolved", count: resolvedCount },
          ]}
        />
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Open history</p>
            <h3 className="mt-2 text-[1.35rem] font-semibold text-[var(--color-dormmate-text-strong)]">Maintenance log</h3>
          </div>
          <span className="text-sm text-[var(--color-dormmate-muted)]">{filteredRequests.length} request{filteredRequests.length === 1 ? "" : "s"}</span>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] p-5 text-sm text-[var(--color-dormmate-muted)]">
            No Maintenance Requests match this filter.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredRequests.map((request) => (
              <article key={request.id} className="rounded-[1.15rem] border border-[var(--color-dormmate-border)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h4 className="text-lg font-semibold text-[var(--color-dormmate-text-strong)]">#{request.id.slice(0, 8)} • {request.tenantName}</h4>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(request.status)}`}>
                        {request.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-dormmate-muted)]">{request.category} • {formatLocation(request)}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-dormmate-text)]">{request.description}</p>
                    {request.attachmentUrls.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {request.attachmentUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-[10px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-dormmate-primary)] hover:underline">View photo {index + 1}</a>)}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2 text-sm text-[var(--color-dormmate-muted)] lg:min-w-[280px]">
                    <p><span className="font-semibold text-[var(--color-dormmate-text-strong)]">Created:</span> {new Date(request.createdAt).toLocaleString()}</p>
                    <p><span className="font-semibold text-[var(--color-dormmate-text-strong)]">Updated:</span> {new Date(request.updatedAt).toLocaleString()}</p>
                    <p><span className="font-semibold text-[var(--color-dormmate-text-strong)]">Landlord notes:</span> {request.landlordNotes ?? "No notes yet"}</p>
                  </div>
                </div>
                <MaintenanceStatusForm requestId={request.id} status={request.status} landlordNotes={request.landlordNotes} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}