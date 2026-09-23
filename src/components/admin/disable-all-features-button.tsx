"use client";

import { useActionState, useState, useTransition } from "react";

import { disableAllUserFeatures } from "@/app/actions/feature-controls";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { AuthFormState } from "@/lib/auth/types";

const initialState: AuthFormState = {};

export function DisableAllFeaturesButton() {
  const [state, action, pending] = useActionState(disableAllUserFeatures, initialState);
  const [open, setOpen] = useState(false);
  const [dispatching, startTransition] = useTransition();
  const busy = pending || dispatching;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen(true)}
        className="rounded-[14px] bg-[#c65f43] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Turn Off All
      </button>
      {state.message ? <p className={`max-w-sm text-xs ${state.success ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p> : null}
      <ConfirmationModal
        open={open}
        title="Turn off all user features?"
        description="This immediately disables every Dashboard and module feature for every Landlord and Tenant account. Profile Settings will remain available so users are not locked out of their account settings."
        confirmLabel="Turn Off All"
        tone="danger"
        pending={busy}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          startTransition(() => action(new FormData()));
        }}
      />
    </div>
  );
}