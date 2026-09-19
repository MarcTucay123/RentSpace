import { CashPaymentStatusForm } from "@/components/landlord/cash-payment-status-form";
import { PaymentReviewActions } from "@/components/landlord/payment-review-actions";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import type { LandlordPaymentItem, LandlordRentMonitoringItem } from "@/lib/landlord/data";

function formatLocation(item: { unitName: string | null; roomNumber: string | null; bedLabel: string | null }) {
  return [item.unitName, item.roomNumber ? `Room: ${item.roomNumber}` : null, item.bedLabel].filter(Boolean).join(" • ") || "No assignment details";
}

function verificationTone(status: string) {
  if (status === "verified") return "bg-[#f0f1ee] text-[#1b263b]";
  if (status === "rejected") return "bg-[#fbe9e5] text-[#cf6a4b]";
  return "bg-[#fff8e7] text-[#c08a26]";
}

function paymentMethodTone(method: LandlordPaymentItem["paymentMethod"]) {
  return method === "gcash" ? "bg-[#e0e1dd] text-[#415a77]" : "bg-[var(--color-dormmate-green-soft)] text-[#1b263b]";
}

export function PaymentRecordsTable({ overdueObligations, payments, paymentObligationIds }: { overdueObligations: LandlordRentMonitoringItem[]; payments: LandlordPaymentItem[]; paymentObligationIds: Set<string> }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-[1.15rem] border border-[var(--color-dormmate-border)]">
      <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
        <thead className="bg-[#f5f6f4] text-[11px] uppercase tracking-[0.08em] text-[var(--color-dormmate-muted)]">
          <tr><th className="px-3 py-4">Tenant</th><th className="px-3 py-4">Assigned To</th><th className="px-3 py-4">Amount</th><th className="px-3 py-4">Payment / Due Date</th><th className="px-3 py-4">Method</th><th className="px-3 py-4">Status</th><th className="px-3 py-4">Proof / Result</th><th className="px-3 py-4">Actions</th></tr>
        </thead>
        <tbody>
          {overdueObligations.map((item) => (
            <tr key={`obligation-${item.rentalObligationId}`} className="border-t border-[#edc3b7] bg-[#fffaf8] align-top">
              <td className="px-3 py-4"><div className="flex items-center gap-2.5"><ProfileAvatar photoUrl={item.tenantProfilePhotoUrl} name={item.tenantName} assignmentLabel={formatLocation(item)} /><span className="font-semibold">{item.tenantName}</span></div></td>
              <td className="px-3 py-4 font-bold text-[var(--color-dormmate-text-strong)]">{formatLocation(item)}</td>
              <td className="px-3 py-4"><p className="font-semibold">₱{item.balance.toLocaleString()}</p><p className="mt-1 text-xs text-[var(--color-dormmate-muted)]">₱{item.amountPaid.toLocaleString()} paid of ₱{item.amountDue.toLocaleString()}</p></td>
              <td className="px-3 py-4 text-[var(--color-dormmate-muted)]"><p>No payment date</p><p className="mt-1 text-xs font-bold text-[var(--color-dormmate-text-strong)]">Due {new Date(`${item.dueDate}T00:00:00`).toLocaleDateString()}</p></td>
              <td className="px-3 py-4"><span className="rounded-full bg-[#f5f6f4] px-2.5 py-1 text-xs font-semibold text-[#415a77]">Not recorded</span></td>
              <td className="px-3 py-4"><div className="flex flex-col items-start gap-1.5"><span className="rounded-full bg-[#fbe9e5] px-2.5 py-1 text-xs font-semibold text-[#cf6a4b]">Overdue</span><span className="rounded-full bg-[#f5f6f4] px-2.5 py-1 text-xs font-semibold text-[#415a77]">Unpaid</span></div></td>
              <td className="px-3 py-4 text-xs text-[var(--color-dormmate-muted)]">{paymentObligationIds.has(item.rentalObligationId) ? "Payment history exists" : "No payment submitted"}</td>
              <td className="px-3 py-4"><CashPaymentStatusForm rentalObligationId={item.rentalObligationId} paymentStatus={item.paymentStatus} /></td>
            </tr>
          ))}
          {payments.map((payment) => (
            <tr key={`payment-${payment.paymentId}`} className="border-t border-[var(--color-dormmate-border)] align-top hover:bg-[#f8f8f6]">
              <td className="px-3 py-4"><div className="flex items-center gap-2.5"><ProfileAvatar photoUrl={payment.tenantProfilePhotoUrl} name={payment.tenantName} assignmentLabel={formatLocation(payment)} /><span className="font-semibold">{payment.tenantName}</span></div></td>
              <td className="px-3 py-4 font-bold text-[var(--color-dormmate-text-strong)]">{formatLocation(payment)}</td>
              <td className="px-3 py-4"><p className="font-semibold">₱{payment.amount.toLocaleString()}</p><p className="mt-1 text-xs text-[var(--color-dormmate-muted)]">₱{payment.amountPaid.toLocaleString()} of ₱{payment.amountDue.toLocaleString()}</p></td>
              <td className="px-3 py-4 text-[var(--color-dormmate-muted)]"><p>{new Date(`${payment.paymentDate}T00:00:00`).toLocaleDateString()}</p><p className="mt-1 text-xs font-bold text-[var(--color-dormmate-text-strong)]">Due {new Date(`${payment.dueDate}T00:00:00`).toLocaleDateString()}</p></td>
              <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${paymentMethodTone(payment.paymentMethod)}`}>{payment.paymentMethod}</span></td>
              <td className="px-3 py-4"><div className="flex flex-col items-start gap-1.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${verificationTone(payment.verificationStatus)}`}>{payment.verificationStatus}</span>{payment.dueStatus !== "paid" || payment.verificationStatus === "verified" ? <span className="rounded-full bg-[#f5f6f4] px-2.5 py-1 text-xs font-semibold capitalize text-[#415a77]">{payment.dueStatus.replaceAll("_", " ")}</span> : null}</div></td>
              <td className="px-3 py-4 text-xs text-[var(--color-dormmate-muted)]">{payment.proofImageUrl ? <a href={payment.proofImageUrl} target="_blank" rel="noreferrer" className="inline-flex whitespace-nowrap rounded-[10px] bg-[var(--color-dormmate-primary)] px-3 py-2 font-semibold text-white shadow-sm transition hover:opacity-90">View Payment Proof</a> : payment.proofImagePath ? "Proof preview unavailable" : payment.rejectionReason ?? (payment.verificationStatus === "verified" ? "Successful payment" : "No proof")}</td>
              <td className="px-3 py-4">{payment.verificationStatus === "pending" ? <PaymentReviewActions paymentId={payment.paymentId} tenantName={payment.tenantName} /> : <span className="text-xs font-semibold text-[var(--color-dormmate-muted)]">Recorded</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}