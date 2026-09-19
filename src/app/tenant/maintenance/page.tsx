import { requireTenantAccess } from "@/lib/auth/utils";
import { getTenantMaintenanceRequests } from "@/lib/tenant/data";

import { MaintenanceRequestForm } from "@/components/tenant/maintenance-request-form";

export const metadata = {
  title: "Maintenance | RentSpace",
};

export default async function TenantMaintenancePage() {
  const { profile } = await requireTenantAccess();
  const requests = await getTenantMaintenanceRequests(profile.id);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Maintenance</p>
          <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-[#0d1b2a] sm:text-[1.8rem]">New maintenance request</h2>
        </div>
        <MaintenanceRequestForm />
      </section>

      {requests.length ? (
        <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
          <h3 className="text-[1.25rem] font-semibold text-[#0d1b2a]">Recent requests</h3>
          <div className="mt-4 space-y-3">
            {requests.slice(0, 3).map((request) => (
              <div key={request.id} className="rounded-[1rem] border border-[#e4ebe5] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[#0d1b2a]">{request.category}</p>
                    <p className="mt-1.5 text-sm leading-6 text-[#415a77]">{request.description}</p>
                    {request.attachment_urls.length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{request.attachment_urls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--color-dormmate-primary)] hover:underline">View photo {index + 1}</a>)}</div> : null}
                  </div>
                  <div className="rounded-full bg-[#fff8e7] px-2.5 py-1 text-xs font-semibold capitalize text-[#c08a26]">
                    {request.status.replaceAll("_", " ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}