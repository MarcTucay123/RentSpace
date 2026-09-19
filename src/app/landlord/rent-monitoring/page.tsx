import { OverdueNotifyButton } from "@/components/landlord/overdue-notify-button";
import { CashPaymentStatusForm } from "@/components/landlord/cash-payment-status-form";
import { FilterNavigation } from "@/components/ui/filter-navigation";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { requireLandlordAccess } from "@/lib/auth/utils";
import { getLandlordRentMonitoring } from "@/lib/landlord/data";

export const metadata = { title: "Rent Monitoring | RentSpace" };

function getDueTone(status: string) {
  if (status === "paid") return "bg-[#f0f1ee] text-[#1b263b]";
  if (status === "overdue") return "bg-[#fbe9e5] text-[#cf6a4b]";
  if (status === "due_today") return "bg-[#fff2df] text-[#b87417]";
  if (status === "due_soon") return "bg-[#fff8e7] text-[#c08a26]";
  return "bg-[#f0f1ee] text-[#1b263b]";
}

function getPaymentTone(status: string) {
  if (status === "paid") return "bg-[#f0f1ee] text-[#1b263b]";
  if (status === "partially_paid") return "bg-[#e0e1dd] text-[#415a77]";
  if (status === "pending_verification") return "bg-[#fff8e7] text-[#c08a26]";
  if (status === "rejected") return "bg-[#fbe9e5] text-[#cf6a4b]";
  return "bg-[#f5f6f4] text-[#415a77]";
}

function formatLocation(item: Awaited<ReturnType<typeof getLandlordRentMonitoring>>[number]) {
  const parts = [item.unitName, item.roomNumber ? `Room: ${item.roomNumber}` : null, item.bedLabel].filter(Boolean);
  return parts.length ? parts.join(" • ") : "No assignment details";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

type RentMonitoringPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LandlordRentMonitoringPage({ searchParams }: RentMonitoringPageProps) {
  await requireLandlordAccess();
  const [obligations, params] = await Promise.all([getLandlordRentMonitoring(), searchParams]);
  const overdueCount = obligations.filter((item) => item.dueStatus === "overdue").length;
  const dueSoonCount = obligations.filter((item) => item.dueStatus === "due_soon" || item.dueStatus === "due_today").length;
  const paidCount = obligations.filter((item) => item.paymentStatus === "paid").length;
  const requestedFilter = typeof params.filter === "string" ? params.filter : "all";
  const selectedFilter = ["all", "overdue", "due_soon", "unpaid", "paid"].includes(requestedFilter) ? requestedFilter : "all";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const normalizedQuery = query.toLocaleLowerCase();
  const filteredObligations = obligations.filter((item) => {
    const matchesFilter = selectedFilter === "due_soon"
      ? item.dueStatus === "due_soon" || item.dueStatus === "due_today"
      : selectedFilter === "overdue"
        ? item.dueStatus === "overdue"
        : selectedFilter === "paid"
          ? item.paymentStatus === "paid"
          : selectedFilter === "unpaid"
            ? item.paymentStatus !== "paid"
            : true;
    return matchesFilter && (!normalizedQuery || item.tenantName.toLocaleLowerCase().includes(normalizedQuery));
  });
  const searchSuggestions = Array.from(new Set(obligations.map((item) => item.tenantName)));

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Rent Monitoring</p>
        <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">Rent ledger</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-dormmate-muted)]">
          Review tenant billing periods, due dates, collection progress, and overdue reminder actions in a formal ledger view.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
        {[
          { label: "Overdue", value: overdueCount, tone: "bg-[#fbe9e5] text-[#cf6a4b]" },
          { label: "Due soon", value: dueSoonCount, tone: "bg-[#fff8e7] text-[#c08a26]" },
          { label: "Paid", value: paidCount, tone: "bg-[#f0f1ee] text-[#1b263b]" },
        ].map((stat) => (
          <article key={stat.label} className="min-w-0 rounded-[1rem] bg-white p-3 shadow-[var(--shadow)] sm:rounded-[1.15rem] sm:p-4">
            <p className="truncate text-xs text-[var(--color-dormmate-muted)] sm:text-sm">{stat.label}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2 sm:mt-2">
              <p className="truncate text-xl font-semibold text-[var(--color-dormmate-text-strong)] sm:text-[1.6rem]">{stat.value}</p>
              <span className={`truncate rounded-full px-2 py-1 text-[10px] font-semibold sm:px-2.5 sm:text-xs ${stat.tone}`}>{stat.label}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <ListSearchForm basePath="/landlord/rent-monitoring" query={query} selectedFilter={selectedFilter} label="Search rent monitoring" placeholder="Search tenant name" suggestions={searchSuggestions} />
        <div className="mt-4">
        <FilterNavigation
          basePath="/landlord/rent-monitoring"
          selected={selectedFilter}
          preservedParams={query ? { q: query } : {}}
          label="Filter Rent Obligations"
          options={[
            { value: "all", label: "All", count: obligations.length },
            { value: "overdue", label: "Overdue", count: overdueCount },
            { value: "due_soon", label: "Due Soon", count: dueSoonCount },
            { value: "unpaid", label: "Unpaid", count: obligations.filter((item) => item.paymentStatus !== "paid").length },
            { value: "paid", label: "Paid", count: paidCount },
          ]}
        />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Current ledger</p>
            <h3 className="mt-2 text-[1.35rem] font-semibold text-[var(--color-dormmate-text-strong)]">Tenant rental obligations</h3>
          </div>
          <span className="text-sm text-[var(--color-dormmate-muted)]">{filteredObligations.length} obligation{filteredObligations.length === 1 ? "" : "s"}</span>
        </div>

        {filteredObligations.length === 0 ? (
          <div className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] p-5 text-sm text-[var(--color-dormmate-muted)]">No rent obligations match this filter.</div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-[1.15rem] border border-[var(--color-dormmate-border)] xl:overflow-x-visible">
            <table className="w-full min-w-[1050px] table-fixed border-collapse text-left text-xs xl:min-w-0 xl:text-sm">
              <colgroup>
                <col className="w-[4%]" />
                <col className="w-[13%]" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="bg-[#f5f6f4] text-[11px] uppercase tracking-[0.08em] text-[var(--color-dormmate-muted)]">
                <tr>
                  <th className="px-2 py-4 xl:px-3">#</th>
                  <th className="px-2 py-4 xl:px-3">Tenant</th>
                  <th className="px-2 py-4 xl:px-3">Assigned To</th>
                  <th className="px-2 py-4 xl:px-3">Due Date</th>
                  <th className="px-2 py-4 xl:px-3">Amount Due</th>
                  <th className="px-2 py-4 xl:px-3">Paid</th>
                  <th className="px-2 py-4 xl:px-3">Balance</th>
                  <th className="px-2 py-4 xl:px-3">Status</th>
                  <th className="px-2 py-4 xl:px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredObligations.map((item, index) => (
                  <tr key={item.rentalObligationId} className="border-t border-[var(--color-dormmate-border)] align-top transition hover:bg-[#f8f8f6]">
                    <td className="px-2 py-5 font-semibold text-[var(--color-dormmate-text-strong)] xl:px-3">{index + 1}</td>
                    <td className="break-words px-2 py-5 font-semibold text-[var(--color-dormmate-text-strong)] xl:px-3">
                      <div className="flex items-center gap-2.5"><ProfileAvatar photoUrl={item.tenantProfilePhotoUrl} name={item.tenantName} assignmentLabel={formatLocation(item)} className="h-9 w-9" /><span>{item.tenantName}</span></div>
                    </td>
                    <td className="break-words px-2 py-5 text-[var(--color-dormmate-muted)] xl:px-3">
                      <p className="font-bold text-[var(--color-dormmate-text-strong)]">{formatLocation(item)}</p>
                      {item.assignmentType ? <p className="mt-1 text-[10px] uppercase tracking-wide">{item.assignmentType.replace("_", " ")}</p> : null}
                    </td>
                    <td className="px-2 py-5 font-bold text-[var(--color-dormmate-text-strong)] xl:px-3">{new Date(`${item.dueDate}T00:00:00`).toLocaleDateString()}</td>
                    <td className="break-words px-2 py-5 font-semibold text-[#b87417] xl:px-3">{formatCurrency(item.amountDue)}</td>
                    <td className="break-words px-2 py-5 text-[var(--color-dormmate-muted)] xl:px-3">{formatCurrency(item.amountPaid)}</td>
                    <td className="break-words px-2 py-5 font-semibold text-[var(--color-dormmate-text-strong)] xl:px-3">{formatCurrency(item.balance)}</td>
                    <td className="px-2 py-5 xl:px-3">
                      <div className="flex flex-col items-start gap-1.5">
                        {item.dueStatus !== item.paymentStatus ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getDueTone(item.dueStatus)}`}>{item.dueStatus.replace("_", " ")}</span> : null}
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getPaymentTone(item.paymentStatus)}`}>{item.paymentStatus.replace("_", " ")}</span>
                      </div>
                    </td>
                    <td className="px-2 py-5 xl:px-3">
                      {item.paymentStatus !== "paid" ? (
                        <div className="space-y-2">
                          {item.dueStatus === "overdue" ? <OverdueNotifyButton obligationId={item.rentalObligationId} tenantName={item.tenantName} /> : null}
                          <CashPaymentStatusForm rentalObligationId={item.rentalObligationId} paymentStatus={item.paymentStatus} />
                        </div>
                      ) : <span className="text-[var(--color-dormmate-muted)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}