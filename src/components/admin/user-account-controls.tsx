"use client";

import { useActionState, useState, useTransition } from "react";

import { manageUserAccount } from "@/app/actions/auth";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { AccountStatus, AuthFormState, UserRole } from "@/lib/auth/types";

const initialState: AuthFormState = {};

type UserAccountControlsProps = {
  profileId: string;
  name: string;
  role: UserRole;
  accountStatus: AccountStatus;
  canRemove: boolean;
};

export function UserAccountControls({ profileId, name, role, accountStatus, canRemove }: UserAccountControlsProps) {
  const [state, action, pending] = useActionState(manageUserAccount, initialState);
  const [removing, startRemoving] = useTransition();
  const [removeOpen, setRemoveOpen] = useState(false);
  const busy = pending || removing;

  return (
    <div className="min-w-[220px] space-y-2">
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="profileId" value={profileId} />
        <input type="hidden" name="operation" value="status" />
        <select name="accountStatus" defaultValue={accountStatus === "inactive" ? "inactive" : "approved"} disabled={busy} className="min-w-0 flex-1 rounded-[12px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[var(--color-dormmate-primary)]">
          <option value="approved">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="submit" disabled={busy} className="rounded-[12px] bg-[var(--color-dormmate-primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save</button>
      </form>

      {role === "tenant" ? (
        canRemove ? (
          <button type="button" disabled={busy} onClick={() => setRemoveOpen(true)} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">Remove unassigned account</button>
        ) : (
          <p className="text-[11px] leading-4 text-[var(--color-dormmate-muted)]">Removal unavailable because assignment history exists. Set Inactive instead.</p>
        )
      ) : null}

      {state.message ? <p className={`text-[11px] leading-4 ${state.success ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p> : null}

      <ConfirmationModal
        open={removeOpen}
        title="Permanently remove tenant account?"
        description={`${name} has no assignment history. This removes the authentication account and profile and cannot be undone.`}
        confirmLabel="Remove Account"
        tone="danger"
        pending={busy}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("profileId", profileId);
          formData.set("operation", "remove");
          startRemoving(() => {
            action(formData);
            setRemoveOpen(false);
          });
        }}
      />
    </div>
  );
}