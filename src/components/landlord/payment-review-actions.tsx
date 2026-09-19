"use client";

import { useActionState, useState, useTransition } from "react";

import { rejectTenantPayment, verifyTenantPayment, type AssignmentFormState } from "@/app/actions/landlord";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

const initialState: AssignmentFormState = {};

export function PaymentReviewActions({ paymentId, tenantName }: { paymentId: string; tenantName: string }) {
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [rejectState, rejectAction, rejecting] = useActionState(rejectTenantPayment, initialState);

  return (
    <div className="mt-3">
      <div className="flex w-full max-w-[170px] flex-col gap-2">
        <button type="button" onClick={() => { setVerifyMessage(null); setVerifyOpen(true); }} className="w-full rounded-[12px] bg-[var(--color-dormmate-primary)] px-3 py-2 text-xs font-semibold text-white">Verify Payment</button>
        <button type="button" onClick={() => setRejectOpen(true)} className="w-full rounded-[12px] border border-[#d98d79] bg-white px-3 py-2 text-xs font-semibold text-[#b9573b]">Reject Payment</button>
      </div>
      {verifyMessage ? <p className={`mt-2 text-xs ${verifyMessage.startsWith("Payment verified") ? "text-emerald-700" : "text-red-600"}`}>{verifyMessage}</p> : null}

      <ConfirmationModal
        open={verifyOpen}
        title="Verify this payment?"
        description={`Confirm that ${tenantName}'s submitted payment proof is valid. This will update the rent balance.`}
        confirmLabel="Verify Payment"
        pending={pending}
        onCancel={() => setVerifyOpen(false)}
        onConfirm={() => startTransition(async () => {
          const result = await verifyTenantPayment(paymentId);
          setVerifyMessage(result.message ?? null);
          if (result.success) setVerifyOpen(false);
        })}
      />

      {rejectOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center px-4 py-6">
          <button type="button" aria-label="Close rejection dialog" disabled={rejecting} onClick={() => setRejectOpen(false)} className="absolute inset-0 bg-[#0d1b2a]/50 backdrop-blur-[2px]" />
          <form action={rejectAction} className="relative w-full max-w-[440px] overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_24px_70px_rgba(13,27,42,0.24)]">
            <div className="h-1.5 bg-[#cf6a4b]" />
            <div className="p-5 sm:p-6">
              <input type="hidden" name="paymentId" value={paymentId} />
              <h2 className="text-xl font-bold text-[var(--color-dormmate-text-strong)]">Reject payment proof?</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-dormmate-muted)]">Tell {tenantName} what needs to be corrected. They will be able to submit a new proof.</p>
              {rejectState.message ? <p className={`mt-3 rounded-[12px] px-3 py-2 text-sm ${rejectState.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{rejectState.message}</p> : null}
              <label className="mt-4 block space-y-1.5">
                <span className="text-sm font-semibold text-[#1b263b]">Rejection reason</span>
                <textarea name="rejectionReason" required minLength={3} maxLength={500} rows={4} placeholder="Example: The receipt amount or reference number is unclear." className="w-full resize-none rounded-[14px] border border-[var(--color-dormmate-border)] px-3 py-2.5 text-sm outline-none focus:border-[#cf6a4b]" />
              </label>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" disabled={rejecting} onClick={() => setRejectOpen(false)} className="rounded-[14px] border border-[var(--color-dormmate-border)] px-4 py-2.5 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={rejecting} className="rounded-[14px] bg-[#c65f43] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{rejecting ? "Rejecting..." : "Reject Payment"}</button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}