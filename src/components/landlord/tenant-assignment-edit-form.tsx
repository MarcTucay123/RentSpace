"use client";

import { useActionState, useState } from "react";

import { updateTenantAssignment, type AssignmentFormState } from "@/app/actions/landlord";
import type { RentalSpaceOption } from "@/components/landlord/tenant-assignment-form";
import { FormModal } from "@/components/ui/form-modal";

const initialState: AssignmentFormState = {};

type TenantAssignmentEditFormProps = {
  assignmentId: string;
  tenantName: string;
  options: RentalSpaceOption[];
  currentOption: RentalSpaceOption;
  moveInDate: string;
  rentDueDate: string | null;
  monthlyRent: number | null;
};

export function TenantAssignmentEditForm({ assignmentId, tenantName, options, currentOption, moveInDate, rentDueDate, monthlyRent }: TenantAssignmentEditFormProps) {
  const [open, setOpen] = useState(false);
  async function updateAndClose(previousState: AssignmentFormState, formData: FormData) {
    const result = await updateTenantAssignment(previousState, formData);
    if (result.success) setOpen(false);
    return result;
  }

  const [state, action, pending] = useActionState(updateAndClose, initialState);
  const editOptions = options.some((option) => option.value === currentOption.value) ? options : [currentOption, ...options];
  const [editedMonthlyRent, setEditedMonthlyRent] = useState((monthlyRent ?? currentOption.rentalRate)?.toString() ?? "");

  function selectRentalSpace(value: string) {
    const option = editOptions.find((item) => item.value === value);
    setEditedMonthlyRent(option?.rentalRate?.toString() ?? "");
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-[12px] border border-[var(--color-dormmate-primary)] bg-white px-3 py-2 text-center text-sm font-semibold leading-5 text-[var(--color-dormmate-primary)] shadow-sm transition hover:bg-[var(--color-dormmate-primary-soft)]">
        Edit Assignment
      </button>
      <FormModal open={open} onClose={() => setOpen(false)} title="Edit Assignment" description={`Update the rental details for ${tenantName}.`}>
        <form action={action} className="space-y-4">
          <input type="hidden" name="assignmentId" value={assignmentId} />
          {state.message && !state.success ? <div className="mt-3 rounded-[12px] bg-red-50 px-3 py-2.5 text-sm text-red-700">{state.message}</div> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-[#1b263b]">Rental space</span>
              <select name="rentalSpace" required defaultValue={currentOption.value} onChange={(event) => selectRentalSpace(event.target.value)} className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]">
                {editOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-[#1b263b]">Move-in date</span><input name="startDate" type="date" required defaultValue={moveInDate} className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)]" /></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-[#1b263b]">First rent due</span><input name="rentDueDate" type="date" required defaultValue={rentDueDate ?? moveInDate} className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)]" /></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-[#1b263b]">Monthly rent</span><input name="monthlyRent" type="number" required min="0.01" step="0.01" value={editedMonthlyRent} onChange={(event) => setEditedMonthlyRent(event.target.value)} placeholder="0.00" className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)]" /><span className="block text-xs text-[var(--color-dormmate-muted)]">Auto-filled when you select a priced space.</span></label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-4 py-2.5 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={pending} className="rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">{pending ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </form>
      </FormModal>
    </>
  );
}