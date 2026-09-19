import { PaymentRecordsTable } from "@/components/landlord/payment-records-table";
import { FilterNavigation } from "@/components/ui/filter-navigation";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { requireLandlordAccess } from "@/lib/auth/utils";
import { getLandlordPayments, getLandlordRentMonitoring } from "@/lib/landlord/data";

export const metadata = { title: "Payments | RentSpace" };

type PaymentsPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LandlordPaymentsPage({ searchParams }: PaymentsPageProps) {
  await requireLandlordAccess();
  const [payments, obligations, params] = await Promise.all([getLandlordPayments(), getLandlordRentMonitoring(), searchParams]);
  const overdueObligations = obligations.filter((item) => item.dueStatus === "overdue" && item.paymentStatus !== "paid");
  const pendingCount = payments.filter((payment) => payment.verificationStatus === "pending").length;
  const verifiedCount = payments.filter((payment) => payment.verificationStatus === "verified").length;
  const rejectedCount = payments.filter((payment) => payment.verificationStatus === "rejected").length;
  const requestedFilter = typeof params.filter === "string" ? params.filter : "all";
  const selectedFilter = ["all", "overdue", "pending", "verified", "rejected"].includes(requestedFilter) ? requestedFilter : "all";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const normalizedQuery = query.toLocaleLowerCase();
  const matchesSearch = (item: { tenantName: string }) => !normalizedQuery || item.tenantName.toLocaleLowerCase().includes(normalizedQuery);
  const filteredPayments = (selectedFilter === "all" ? payments : payments.filter((payment) => payment.verificationStatus === selectedFilter))
    .filter(matchesSearch);
  const paymentObligationIds = new Set(payments.map((payment) => payment.rentalObligationId));
  const displayedOverdueObligations = selectedFilter === "overdue"
    ? overdueObligations.filter(matchesSearch)
    : selectedFilter === "all"
      ? overdueObligations.filter((item) => !paymentObligationIds.has(item.rentalObligationId) && matchesSearch(item))
      : [];
  const displayedRecordCount = filteredPayments.length + displayedOverdueObligations.length;
  const searchSuggestions = Array.from(new Set([...payments.map((payment) => payment.tenantName), ...obligations.map((obligation) => obligation.tenantName)]));

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Payments</p>
        <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">Payment management</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-dormmate-muted)]">
          Review submitted payment proofs, record or reverse cash payments, and manage overdue obligations that do not yet have a payment record.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
        {[
          { label: "Overdue", value: overdueObligations.length, tone: "bg-[#fbe9e5] text-[#cf6a4b]" },
          { label: "Pending", value: pendingCount, tone: "bg-[#fff8e7] text-[#c08a26]" },
          { label: "Verified", value: verifiedCount, tone: "bg-[#f0f1ee] text-[#1b263b]" },
        ].map((stat) => (
          <article key={stat.label} className="min-w-0 rounded-[1rem] bg-white p-3 shadow-[var(--shadow)] sm:rounded-[1.15rem] sm:p-4">
            <p className="truncate text-xs text-[var(--color-dormmate-muted)] sm:text-sm">{stat.label}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2 sm:mt-2"><p className="text-xl font-semibold text-[var(--color-dormmate-text-strong)] sm:text-[1.6rem]">{stat.value}</p><span className={`truncate rounded-full px-2 py-1 text-[10px] font-semibold sm:px-2.5 sm:text-xs ${stat.tone}`}>{stat.label}</span></div>
          </article>
        ))}
      </section>

      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <ListSearchForm basePath="/landlord/payments" query={query} selectedFilter={selectedFilter} label="Search payments" placeholder="Search tenant name" suggestions={searchSuggestions} />
        <div className="mt-4">
        <FilterNavigation
          basePath="/landlord/payments"
          selected={selectedFilter}
          preservedParams={query ? { q: query } : {}}
          label="Filter Payments"
          options={[
            { value: "all", label: "All", count: payments.length + overdueObligations.filter((item) => !paymentObligationIds.has(item.rentalObligationId)).length },
            { value: "overdue", label: "Overdue", count: overdueObligations.length },
            { value: "pending", label: "Pending", count: pendingCount },
            { value: "verified", label: "Verified", count: verifiedCount },
            { value: "rejected", label: "Rejected", count: rejectedCount },
          ]}
        />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Current records</p>
            <h3 className="mt-2 text-[1.35rem] font-semibold text-[var(--color-dormmate-text-strong)]">{selectedFilter === "overdue" ? "Overdue rental obligations" : "Payment records"}</h3>
          </div>
          <span className="text-sm text-[var(--color-dormmate-muted)]">{displayedRecordCount} record{displayedRecordCount === 1 ? "" : "s"}</span>
        </div>

        {displayedRecordCount === 0 ? (
          <div className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] p-5 text-sm text-[var(--color-dormmate-muted)]">No payment records match this filter.</div>
        ) : (
          <PaymentRecordsTable overdueObligations={displayedOverdueObligations} payments={filteredPayments} paymentObligationIds={paymentObligationIds} />
        )}
      </section>
    </div>
  );
}