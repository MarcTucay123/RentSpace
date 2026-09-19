"use client";

import { useActionState } from "react";

import { updateMaintenanceRequest, type AssignmentFormState } from "@/app/actions/landlord";

const initialState: AssignmentFormState = {};

export function MaintenanceStatusForm({ requestId, status, landlordNotes }: { requestId: string; status: string; landlordNotes: string | null }) {
  const [state, action, pending] = useActionState(updateMaintenanceRequest, initialState);

  return (
    <form action={action} className="mt-4 grid gap-3 border-t border-[var(--color-dormmate-border)] pt-4 sm:grid-cols-[190px_minmax(0,1fr)_auto] sm:items-end">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-dormmate-muted)]">Update status</span>
        <select name="status" defaultValue={status} disabled={pending} className="w-full rounded-[12px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)]">
          <option value="pending">Pending</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-dormmate-muted)]">Landlord notes</span>
        <input name="landlordNotes" defaultValue={landlordNotes ?? ""} maxLength={1000} placeholder="Optional update or resolution notes" disabled={pending} className="w-full rounded-[12px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)]" />
      </label>
      <button type="submit" disabled={pending} className="rounded-[12px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving..." : "Save Update"}</button>
      {state.message ? <p className={`text-xs sm:col-span-3 ${state.success ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p> : null}
    </form>
  );
}