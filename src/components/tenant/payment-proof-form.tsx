"use client";

import { useActionState } from "react";

import { submitPaymentProof, type TenantActionState } from "@/app/actions/tenant";

const initialState: TenantActionState = {};

export function PaymentProofForm({ rentalObligationId }: { rentalObligationId: string }) {
  const [state, action, pending] = useActionState(submitPaymentProof, initialState);

  return (
    <form action={action} className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
      <input type="hidden" name="rentalObligationId" value={rentalObligationId} />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-dormmate-primary)]">GCash payment proof</p>
      <h3 className="mt-2 text-lg font-semibold text-[#0d1b2a]">Submit your receipt</h3>
      <p className="mt-1 text-sm text-[var(--color-dormmate-muted)]">Upload your GCash receipt. Your payment remains pending until the Landlord verifies it.</p>
      {state.message ? <div className={`mt-3 rounded-[12px] px-3 py-2.5 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{state.message}</div> : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1 space-y-1.5">
          <span className="text-sm font-semibold text-[#1b263b]">Receipt image</span>
          <input name="paymentProof" type="file" required accept="image/png,image/jpeg,image/webp" className="block w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-dormmate-green-soft)] file:px-3 file:py-1.5 file:font-semibold file:text-[#1b263b]" />
          <span className="block text-xs text-[var(--color-dormmate-muted)]">PNG, JPG, or WEBP • maximum 5MB</span>
        </label>
        <button type="submit" disabled={pending} className="rounded-[14px] bg-[#1b263b] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">{pending ? "Uploading..." : "Submit Proof"}</button>
      </div>
    </form>
  );
}