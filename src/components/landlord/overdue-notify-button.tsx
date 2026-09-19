"use client";

import { useState, useTransition } from "react";

import { notifyTenantOfOverdueRent } from "@/app/actions/landlord";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

export function OverdueNotifyButton({ obligationId, tenantName }: { obligationId: string; tenantName: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button type="button" onClick={() => { setMessage(null); setOpen(true); }} className="rounded-[12px] border border-[#d98d79] bg-white px-3 py-2 text-xs font-semibold text-[#b9573b]">Notify Tenant</button>
      {message ? <p className={`mt-2 text-xs ${message.startsWith("Overdue reminder sent") ? "text-emerald-700" : "text-red-600"}`}>{message}</p> : null}
      <ConfirmationModal
        open={open}
        title="Send overdue reminder?"
        description={`Send ${tenantName} a prewritten message and notification containing their due date and outstanding balance.`}
        confirmLabel="Send Reminder"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => startTransition(async () => {
          const result = await notifyTenantOfOverdueRent(obligationId);
          setMessage(result.message ?? null);
          if (result.success) setOpen(false);
        })}
      />
    </div>
  );
}