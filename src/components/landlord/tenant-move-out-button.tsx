"use client";

import { useState, useTransition } from "react";

import { completeTenantAssignment } from "@/app/actions/landlord";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

type TenantMoveOutButtonProps = {
  assignmentId: string;
  tenantName: string;
};

export function TenantMoveOutButton({ assignmentId, tenantName }: TenantMoveOutButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmMoveOut() {
    startTransition(async () => {
      const result = await completeTenantAssignment(assignmentId);
      setMessage(result.message ?? null);
      if (result.success) setOpen(false);
    });
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setOpen(true);
        }}
        className="w-full rounded-[12px] border border-[#d98d79] bg-white px-3 py-2 text-center text-sm font-semibold leading-5 text-[#b9573b] shadow-sm transition hover:bg-[#fff7f4]"
      >
        Move Out Tenant
      </button>
      {message ? <p className={`text-xs ${message.startsWith("Move-out completed") ? "text-emerald-700" : "text-red-600"}`}>{message}</p> : null}
      <ConfirmationModal
        open={open}
        title="Complete rental assignment?"
        description={`${tenantName} will be marked as moved out today. Their account and history will remain, but the assigned rental space will become available again.`}
        confirmLabel="Confirm Move Out"
        tone="danger"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={confirmMoveOut}
      />
    </div>
  );
}