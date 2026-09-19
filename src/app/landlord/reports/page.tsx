import { requireLandlordAccess } from "@/lib/auth/utils";
import { getLandlordMonthlyReport, getReportMonth } from "@/lib/landlord/reports";

export const metadata = { title: "Reports | RentSpace" };

type ReportsPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const currencyFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function statusTone(status: string) {
  if (status === "paid" || status === "verified" || status === "resolved") return "bg-[#e8f3e7] text-[#346b3a]";
  if (status === "overdue" || status === "rejected") return "bg-[#fbe9e5] text-[#b9573b]";
  if (status === "pending" || status === "pending_verification" || status === "due_soon" || status === "due_today") return "bg-[#fff4d9] text-[#9a6b16]";
  return "bg-[#f0f1ee] text-[#415a77]";
}

export default async function LandlordReportsPage({ searchParams }: ReportsPageProps) {
  await requireLandlordAccess();
  const params = await searchParams;
  const requestedMonth = typeof params.month === "string" ? params.month : null;
  const month = getReportMonth(requestedMonth);
  const report = await getLandlordMonthlyReport(month);
  const { summary } = report;

  return (
    <div className="space-y-4">
      <section className="portal-hero overflow-hidden rounded-[1.5rem] text-white">
        <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9fb9b5]">Monthly reports</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">{report.monthLabel} portfolio report</h1>
            <p className="mt-2 text-sm text-[#e0e1dd]">Collections, rent status, payments, and maintenance in one clear monthly view.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form action="/landlord/reports" method="get" className="flex items-center gap-2 rounded-xl bg-white/10 p-1.5 ring-1 ring-white/20">
              <label htmlFor="report-month" className="sr-only">Report month</label>
              <input id="report-month" name="month" type="month" defaultValue={month} className="min-w-0 rounded-lg border-0 bg-white px-3 py-2 text-sm font-semibold text-[#253d3b] outline-none" />
              <button type="submit" className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/25">View</button>
            </form>
            <a href={`/landlord/reports/download?month=${month}`} className="inline-flex items-center justify-center rounded-xl bg-[#f4cf58] px-4 py-3 text-sm font-bold text-[#253d3b] shadow-sm transition hover:bg-[#ffdc69]">
              <span aria-hidden="true" className="mr-2">↓</span> Download monthly report
            </a>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Monthly report highlights">
        {[
          { label: "Amount due", value: currencyFormatter.format(summary.totalAmountDue), helper: `${summary.obligationsCount} obligations`, tone: "text-[var(--color-dormmate-text-strong)]", mark: "₱" },
          { label: "Collected", value: currencyFormatter.format(summary.totalAmountPaid), helper: `${summary.collectionRate}% collection rate`, tone: "text-[#315a57]", mark: "✓" },
          { label: "Outstanding", value: currencyFormatter.format(summary.outstandingBalance), helper: `${summary.overdueObligationsCount} overdue`, tone: "text-[#b87417]", mark: "!" },
          { label: "Occupancy", value: `${summary.occupancyRate}%`, helper: `${summary.assignedTenantsCount} of ${summary.tenantsCount} tenants assigned`, tone: "text-[#1b263b]", mark: "O" },
        ].map((card) => (
          <article key={card.label} className="surface-elevated min-w-0 rounded-[1.2rem] bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-dormmate-muted)]">{card.label}</p><p className={`mt-2 truncate text-xl font-bold tracking-tight sm:text-2xl ${card.tone}`}>{card.value}</p></div>
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e7f0ee] text-sm font-black text-[#315a57]">{card.mark}</span>
            </div>
            <p className="mt-3 truncate text-xs font-medium text-[var(--color-dormmate-muted)]">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <article className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Rent performance</p><h2 className="mt-2 text-xl font-semibold text-[var(--color-dormmate-text-strong)]">Monthly collection progress</h2><p className="mt-1 text-sm font-semibold text-[var(--color-dormmate-muted)]">{report.monthLabel}</p></div>
            <span className="rounded-full bg-[#e7f0ee] px-3 py-1.5 text-sm font-bold text-[#315a57]">{summary.collectionRate}%</span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e0e1dd]" aria-label={`${summary.collectionRate}% of monthly rent collected`}>
            <div className="h-full rounded-full bg-[#315a57]" style={{ width: `${Math.min(summary.collectionRate, 100)}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
            {[
              { label: "Paid obligations", value: summary.paidObligationsCount, tone: "text-[#315a57]" },
              { label: "Pending payments", value: summary.pendingPaymentsCount, tone: "text-[#a87419]" },
              { label: "Overdue", value: summary.overdueObligationsCount, tone: "text-[#b9573b]" },
            ].map((item) => <div key={item.label} className="min-w-0 rounded-[1rem] bg-[#f5f6f4] p-2.5 sm:p-4"><p className={`text-xl font-bold sm:text-2xl ${item.tone}`}>{item.value}</p><p className="mt-1 text-[10px] leading-4 text-[var(--color-dormmate-muted)] sm:text-sm">{item.label}</p></div>)}
          </div>
        </article>

        <article className="rounded-[1.35rem] bg-[#e7f0ee] p-4 shadow-[var(--shadow)] sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Monthly activity</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-dormmate-text-strong)]">Operations summary</h2>
          <div className="mt-5 space-y-2.5">
            {[
              { label: "Payments recorded", value: summary.paymentsCount },
              { label: "Verified payments", value: summary.verifiedPaymentsCount },
              { label: "Maintenance requests", value: summary.maintenanceCount },
              { label: "Open maintenance", value: summary.pendingMaintenanceCount },
            ].map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3"><span className="text-sm font-medium text-[var(--color-dormmate-text)]">{item.label}</span><strong className="text-[var(--color-dormmate-text-strong)]">{item.value}</strong></div>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--color-dormmate-muted)]">Occupancy uses the current tenant assignment snapshot. Financial and activity figures use {report.monthLabel} records.</p>
        </article>
      </section>

      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Monthly ledger</p><h2 className="mt-2 text-xl font-semibold text-[var(--color-dormmate-text-strong)]">Rent obligations</h2></div>
          <span className="text-sm text-[var(--color-dormmate-muted)]">{report.obligations.length} record{report.obligations.length === 1 ? "" : "s"}</span>
        </div>
        {report.obligations.length === 0 ? (
          <div className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] p-5 text-sm text-[var(--color-dormmate-muted)]">No rent obligations for {report.monthLabel}.</div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-[1.15rem] border border-[var(--color-dormmate-border)]">
            <table className="w-full min-w-[1020px] table-fixed border-collapse text-left text-sm">
              <thead className="bg-[#f5f6f4] text-[11px] uppercase tracking-[0.08em] text-[var(--color-dormmate-muted)]"><tr><th className="px-3 py-4">Tenant</th><th className="px-3 py-4">Assigned To</th><th className="px-3 py-4">Due Date</th><th className="px-3 py-4">Amount Due</th><th className="px-3 py-4">Paid</th><th className="px-3 py-4">Balance</th><th className="px-3 py-4">Payment Method</th><th className="px-3 py-4">Status</th></tr></thead>
              <tbody>
                {report.obligations.map((item) => (
                  <tr key={item.rentalObligationId} className="border-t border-[var(--color-dormmate-border)] align-top transition hover:bg-[#f8f8f6]">
                    <td className="px-3 py-4 font-semibold text-[var(--color-dormmate-text-strong)]">{item.tenantName}</td>
                    <td className="px-3 py-4 text-[var(--color-dormmate-muted)]">{[item.unitName, item.roomNumber ? `Room: ${item.roomNumber}` : null, item.bedLabel].filter(Boolean).join(" • ") || "No assignment"}</td>
                    <td className="px-3 py-4 font-medium">{new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("en-PH")}</td>
                    <td className="px-3 py-4 font-semibold text-[#b87417]">{currencyFormatter.format(item.amountDue)}</td>
                    <td className="px-3 py-4 text-[var(--color-dormmate-muted)]">{currencyFormatter.format(item.amountPaid)}</td>
                    <td className="px-3 py-4 font-semibold">{currencyFormatter.format(item.balance)}</td>
                    <td className="px-3 py-4">{item.paymentMethod ? <span className="rounded-full bg-[#e7f0ee] px-2.5 py-1 text-xs font-semibold text-[#315a57]">{item.paymentMethod}</span> : <span className="text-[var(--color-dormmate-muted)]">—</span>}</td>
                    <td className="px-3 py-4"><div className="flex flex-col items-start gap-1.5">{item.dueStatus !== item.paymentStatus ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(item.dueStatus)}`}>{item.dueStatus.replaceAll("_", " ")}</span> : null}<span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(item.paymentStatus)}`}>{item.paymentStatus.replaceAll("_", " ")}</span></div></td>
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