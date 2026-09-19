"use client";

import { useActionState, useState } from "react";

import { assignTenantToRentalSpace, type AssignmentFormState } from "@/app/actions/landlord";
import { FormModal } from "@/components/ui/form-modal";

export type RentalSpaceOption = {
  value: string;
  label: string;
  rentalRate: number | null;
};

const initialState: AssignmentFormState = {};

type TenantAssignmentFormProps = {
  tenantProfileId: string;
  tenantName: string;
  options: RentalSpaceOption[];
  defaultStartDate: string;
};

export function TenantAssignmentForm({ tenantProfileId, tenantName, options, defaultStartDate }: TenantAssignmentFormProps) {
  const [open, setOpen] = useState(false);
  const [monthlyRent, setMonthlyRent] = useState("");

  async function assignAndClose(previousState: AssignmentFormState, formData: FormData) {
    const result = await assignTenantToRentalSpace(previousState, formData);
    if (result.success) setOpen(false);
    return result;
  }

  const [state, action, pending] = useActionState(assignAndClose, initialState);

  function selectRentalSpace(value: string) {
    const option = options.find((item) => item.value === value);
    setMonthlyRent(option?.rentalRate?.toString() ?? "");
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-[12px] bg-[var(--color-dormmate-primary)] px-3 py-2 text-center text-sm font-semibold leading-5 text-white shadow-sm transition hover:opacity-90">Assign Tenant</button>
      <FormModal open={open} onClose={() => setOpen(false)} title="Assign Tenant" description={`Choose an available rental space for ${tenantName}.`}>
        <form action={action} className="min-w-0 space-y-4">
          <input type="hidden" name="tenantProfileId" value={tenantProfileId} />
          {state.message ? (
            <div className={`rounded-[12px] px-3 py-2.5 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {state.message}
            </div>
          ) : null}

      {options.length === 0 ? (
        <p className="mt-3 rounded-[12px] bg-white px-3 py-3 text-sm text-[var(--color-dormmate-muted)]">
          No available rental spaces. Add or free a Unit, Room, or Bed Space first.
        </p>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="block min-w-0 space-y-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-[#1b263b]">Available space</span>
            <select name="rentalSpace" required defaultValue="" onChange={(event) => selectRentalSpace(event.target.value)} className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]">
              <option value="" disabled>Select a rental space</option>
              {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-[#1b263b]">Move-in date</span>
            <input name="startDate" type="date" required defaultValue={defaultStartDate} className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-[#1b263b]">First rent due date</span>
            <input name="rentDueDate" type="date" required defaultValue={defaultStartDate} className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-[#1b263b]">Monthly rent</span>
            <input name="monthlyRent" type="number" required min="0.01" step="0.01" value={monthlyRent} onChange={(event) => setMonthlyRent(event.target.value)} placeholder="0.00" className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]" />
            <span className="block text-xs text-[var(--color-dormmate-muted)]">Auto-filled from the selected space rate; you can override it.</span>
          </label>
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <button type="submit" disabled={pending} className="rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Assigning..." : "Assign Tenant"}</button>
          </div>
        </div>
      )}
        </form>
      </FormModal>
    </>
  );
}