"use client";

import { useActionState, useRef, useState } from "react";

import { recordCashPayment, type AssignmentFormState } from "@/app/actions/landlord";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

const initialState: AssignmentFormState = {};

export function CashPaymentStatusForm({
  rentalObligationId,
  paymentStatus,
  cashPaymentId,
}: {
  rentalObligationId: string;
  paymentStatus: string;
  cashPaymentId?: string;
}) {
  const [state, action, pending] = useActionState(recordCashPayment, initialState);
  const isPaidCashRecord = Boolean(cashPaymentId) && paymentStatus === "paid";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedSubmission = useRef(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (isPaidCashRecord || confirmedSubmission.current) {
      confirmedSubmission.current = false;
      return;
    }

    event.preventDefault();
    setConfirmOpen(true);
  }

  function confirmPaidStatus() {
    confirmedSubmission.current = true;
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={action} onSubmit={handleSubmit}>
        <input type="hidden" name="rentalObligationId" value={rentalObligationId} />
        {cashPaymentId ? <input type="hidden" name="cashPaymentId" value={cashPaymentId} /> : null}
        <label className="flex flex-col items-start gap-2 text-sm">
          <span className="font-semibold text-[var(--color-dormmate-text-strong)]">Record cash payment</span>
          <input type="hidden" name="paymentStatus" value={isPaidCashRecord ? "unpaid" : "paid"} />
          <button type="submit" disabled={pending} className="whitespace-nowrap rounded-[12px] bg-[var(--color-dormmate-primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending ? "Saving..." : isPaidCashRecord ? "Reverse Payment" : "Mark as Paid"}</button>
        </label>
        {state.message ? <p className={`mt-2 text-xs ${state.success ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p> : null}
      </form>
      <ConfirmationModal
        open={confirmOpen}
        title="Mark this rent as paid?"
        description="Confirm that you received this cash payment. This will update the tenant's rent balance and record the obligation as paid."
        confirmLabel="Mark as Paid"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmPaidStatus}
      />
    </>
  );
}