import { requireTenantAccess } from "@/lib/auth/utils";
import { getTenantRentalHistory, getTenantRentalSnapshot } from "@/lib/tenant/data";
import { PaymentProofForm } from "@/components/tenant/payment-proof-form";

export const metadata = {
  title: "My Rental | RentSpace",
};

function formatCurrency(value: number | null) {
  if (value === null) return "₱0.00";
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function getLocationLabel(snapshot: Awaited<ReturnType<typeof getTenantRentalSnapshot>>) {
  if (!snapshot?.unitName) return "No active rental assignment";
  if (snapshot.assignmentType === "bed_space") return `${snapshot.unitName} · Room: ${snapshot.roomNumber ?? "—"} · ${snapshot.bedLabel ?? "Bed"}`;
  if (snapshot.assignmentType === "room_space") return `${snapshot.unitName} · Room: ${snapshot.roomNumber ?? "—"}`;
  return snapshot.unitName;
}

function getDueTone(status: string | null | undefined) {
  if (status === "paid") return "bg-[#f0f1ee] text-[#1b263b]";
  if (status === "overdue") return "bg-[#fbe9e5] text-[#cf6a4b]";
  if (status === "due_today") return "bg-[#fff2df] text-[#b87417]";
  if (status === "due_soon") return "bg-[#fff8e7] text-[#c08a26]";
  return "bg-[#f0f1ee] text-[#1b263b]";
}

function getPaymentTone(status: string | null | undefined) {
  if (status === "paid") return "bg-[#f0f1ee] text-[#1b263b]";
  if (status === "partially_paid") return "bg-[#e0e1dd] text-[#415a77]";
  if (status === "pending_verification") return "bg-[#fff8e7] text-[#c08a26]";
  if (status === "rejected") return "bg-[#fbe9e5] text-[#cf6a4b]";
  return "bg-[#f5f6f4] text-[#415a77]";
}

export default async function TenantMyRentalPage() {
  const { profile } = await requireTenantAccess();
  const [snapshot, history] = await Promise.all([getTenantRentalSnapshot(profile.id), getTenantRentalHistory(profile.id)]);
  const status = snapshot?.paymentStatus ?? "unpaid";

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#415a77]">Current monthly rent</p>
            <h2 className="mt-2 text-[1.7rem] font-bold tracking-tight text-[#0d1b2a] sm:text-[2rem]">
              {formatCurrency(snapshot?.amountDue ?? null)}
            </h2>
            <p className="mt-2 text-sm text-[#415a77]">{getLocationLabel(snapshot)}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#415a77]">Due date</p>
            <h2 className="mt-2 text-[1.7rem] font-bold tracking-tight text-[#0d1b2a] sm:text-[2rem]">
              {formatDate(snapshot?.dueDate ?? null)}
            </h2>
            <div className="mt-3 inline-flex rounded-full bg-[var(--color-dormmate-green-soft)] px-2.5 py-1 text-xs font-semibold capitalize text-[#1b263b]">
              {status.replaceAll("_", " ")}
            </div>
            {snapshot?.dueStatus ? <div className={`ml-2 mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getDueTone(snapshot.dueStatus)}`}>{snapshot.dueStatus.replaceAll("_", " ")}</div> : null}
          </div>
        </div>
      </section>

      <section className="rounded-[1rem] bg-[#fff8e7] px-4 py-3 text-sm leading-6 text-[#41945a] shadow-[var(--shadow)]">
        {status === "paid"
          ? "Your rent is confirmed paid for this month."
          : status === "pending_verification"
            ? "Your payment proof is under review by the Landlord."
            : "Please coordinate with the Landlord regarding your latest rent status."}
      </section>

      {snapshot?.obligationId && !["paid", "pending_verification"].includes(status) ? (
        <PaymentProofForm rentalObligationId={snapshot.obligationId} />
      ) : null}

      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-dormmate-primary)]">Monthly ledger</p>
            <h3 className="mt-2 text-xl font-semibold text-[#0d1b2a]">Rental payment history</h3>
          </div>
          <p className="text-sm text-[var(--color-dormmate-muted)]">{history.length} billing period{history.length === 1 ? "" : "s"}</p>
        </div>

        {history.length === 0 ? (
          <div className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] p-5 text-sm text-[var(--color-dormmate-muted)]">No rental payment history yet.</div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-[1.15rem] border border-[var(--color-dormmate-border)]">
            <table className="w-full min-w-[860px] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[6%]" />
                <col className="w-[24%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead className="bg-[#f5f6f4] text-[11px] uppercase tracking-[0.08em] text-[var(--color-dormmate-muted)]">
                <tr>
                  <th className="px-3 py-4">#</th>
                  <th className="px-3 py-4">Billing Period</th>
                  <th className="px-3 py-4">Due Date</th>
                  <th className="px-3 py-4">Amount Due</th>
                  <th className="px-3 py-4">Paid</th>
                  <th className="px-3 py-4">Balance</th>
                  <th className="px-3 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={item.obligationId} className="border-t border-[var(--color-dormmate-border)] align-top transition hover:bg-[#f8f8f6]">
                    <td className="px-3 py-5 font-semibold text-[var(--color-dormmate-text-strong)]">{index + 1}</td>
                    <td className="px-3 py-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[var(--color-dormmate-text-strong)]">{formatDate(item.periodStart)} – {formatDate(item.periodEnd)}</span>
                        {index === 0 ? <span className="rounded-full bg-[#e0e1dd] px-2.5 py-1 text-xs font-semibold text-[#415a77]">Current</span> : null}
                      </div>
                    </td>
                    <td className="px-3 py-5 font-bold text-[var(--color-dormmate-text-strong)]">{formatDate(item.dueDate)}</td>
                    <td className="px-3 py-5 font-semibold text-[#b87417]">{formatCurrency(item.amountDue)}</td>
                    <td className="px-3 py-5 text-[var(--color-dormmate-muted)]">{formatCurrency(item.amountPaid)}</td>
                    <td className="px-3 py-5 font-semibold text-[var(--color-dormmate-text-strong)]">{formatCurrency(item.balance)}</td>
                    <td className="px-3 py-5">
                      <div className="flex flex-col items-start gap-1.5">
                        {item.dueStatus !== item.paymentStatus ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getDueTone(item.dueStatus)}`}>{item.dueStatus.replaceAll("_", " ")}</span> : null}
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getPaymentTone(item.paymentStatus)}`}>{item.paymentStatus.replaceAll("_", " ")}</span>
                      </div>
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