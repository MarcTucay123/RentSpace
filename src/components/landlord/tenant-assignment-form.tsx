"use client";

import { useActionState, useState } from "react";

import { assignTenantToRentalSpace, type AssignmentFormState } from "@/app/actions/landlord";
import { FormModal } from "@/components/ui/form-modal";

export type RentalSpaceOption = {
  value: string;
  label: string;
  rentalRate: number | null;
  category: "apartment" | "room_space" | "bed_space";
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
  const firstAvailableCategory = options[0]?.category ?? "apartment";
  const [category, setCategory] = useState<RentalSpaceOption["category"]>(firstAvailableCategory);
  const [selectionMode, setSelectionMode] = useState<"select" | "search">("select");
  const [selectedValue, setSelectedValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const categoryOptions = options.filter((option) => option.category === category);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const matchingOptions = categoryOptions.filter((option) => !normalizedQuery || option.label.toLocaleLowerCase().includes(normalizedQuery));

  async function assignAndClose(previousState: AssignmentFormState, formData: FormData) {
    const result = await assignTenantToRentalSpace(previousState, formData);
    if (result.success) setOpen(false);
    return result;
  }

  const [state, action, pending] = useActionState(assignAndClose, initialState);

  function selectRentalSpace(value: string) {
    const option = options.find((item) => item.value === value);
    setSelectedValue(value);
    setMonthlyRent(option?.rentalRate?.toString() ?? "");
  }

  function selectCategory(value: RentalSpaceOption["category"]) {
    setCategory(value);
    setSelectedValue("");
    setSearchQuery("");
    setMonthlyRent("");
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
            <span className="text-sm font-semibold text-[#1b263b]">Rental category</span>
            <select value={category} onChange={(event) => selectCategory(event.target.value as RentalSpaceOption["category"])} className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]">
              <option value="apartment">Apartment</option>
              <option value="room_space">Room Space</option>
              <option value="bed_space">Bed Space</option>
            </select>
          </label>
          <div className="min-w-0 space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[#1b263b]">Available space</span>
              <label className="flex items-center gap-2">
                <span className="sr-only">Choose how to find a rental space</span>
                <select value={selectionMode} onChange={(event) => setSelectionMode(event.target.value as "select" | "search")} className="rounded-[10px] border border-[var(--color-dormmate-primary)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--color-dormmate-primary)] outline-none focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]">
                  <option value="select">Select</option>
                  <option value="search">Search</option>
                </select>
              </label>
            </div>
            <input type="hidden" name="rentalSpace" value={selectedValue} />
            {categoryOptions.length === 0 ? (
              <p className="rounded-[12px] bg-[var(--color-dormmate-surface)] px-3 py-3 text-sm text-[var(--color-dormmate-muted)]">No available spaces in this category.</p>
            ) : selectionMode === "select" ? (
              <select required value={selectedValue} onChange={(event) => selectRentalSpace(event.target.value)} className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]">
                <option value="" disabled>Select a rental space</option>
                {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : (
              <div className="space-y-2">
                <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} autoComplete="off" placeholder="Type a unit, room, or bed name" className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]" />
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-[14px] border border-[var(--color-dormmate-border)] bg-[#f8f8f6] p-2">
                  {matchingOptions.length === 0 ? <p className="px-2 py-3 text-sm text-[var(--color-dormmate-muted)]">No spaces match your search.</p> : matchingOptions.map((option) => (
                    <button key={option.value} type="button" onClick={() => selectRentalSpace(option.value)} className={`block w-full rounded-[10px] px-3 py-2 text-left text-sm transition ${selectedValue === option.value ? "bg-[var(--color-dormmate-primary)] text-white" : "bg-white text-[var(--color-dormmate-text-strong)] hover:bg-[var(--color-dormmate-green-soft)]"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
            <button type="submit" disabled={pending || !selectedValue} className="rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Assigning..." : "Assign Tenant"}</button>
          </div>
        </div>
      )}
        </form>
      </FormModal>
    </>
  );
}