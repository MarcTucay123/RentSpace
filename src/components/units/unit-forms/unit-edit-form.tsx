"use client";

import { useActionState } from "react";

import { updateUnit } from "@/app/actions/units";
import { FormStatus } from "@/components/auth/form-status";
import { TextField } from "@/components/auth/text-field";
import { getUnitCategoryLabel, type UnitFormState, type UnitListItem } from "@/lib/units/types";

type UnitEditFormProps = {
  unit: UnitListItem;
  onCancel?: () => void;
  onSuccess?: () => void;
};

const initialState: UnitFormState = {};

export function UnitEditForm({ unit, onCancel, onSuccess }: UnitEditFormProps) {
  async function saveAndClose(previousState: UnitFormState, formData: FormData) {
    const result = await updateUnit(previousState, formData);
    if (result.success) onSuccess?.();
    return result;
  }
  const [state, action, pending] = useActionState(saveAndClose, initialState);

  return (
    <section className="rounded-[1.35rem] border border-[var(--color-dormmate-border)] bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">
        Unit Details
      </p>
      <h3 className="mt-2 text-[1.45rem] font-semibold tracking-tight sm:text-[1.6rem]">Edit unit</h3>

      <form action={action} className="mt-5 space-y-4">
        <FormStatus message={state.message} success={state.success} />
        <input type="hidden" name="unitId" value={unit.id} />

        <TextField label="Unit Name / Number" name="unitName" defaultValue={unit.unit_name} required error={state.errors?.unitName?.[0]} />

        {unit.unit_category === "apartment" ? <TextField label="Rental Rate" name="rentalRate" type="number" defaultValue={unit.rental_rate?.toString() ?? ""} error={state.errors?.rentalRate?.[0]} /> : <input type="hidden" name="rentalRate" value="" />}

        <label className="block space-y-2">
          <span className="text-sm font-medium">Unit Category</span>
          <input
            value={getUnitCategoryLabel(unit.unit_category)}
            disabled
            className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-gray-100 px-4 py-2.5 text-sm text-[var(--color-dormmate-muted)]"
          />
          <p className="text-xs text-[var(--color-dormmate-muted)]">Category changes are locked to preserve rental structure integrity.</p>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Description / Notes</span>
          <textarea
            name="description"
            rows={4}
            defaultValue={unit.description ?? ""}
            className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Status</span>
          <select
            name="status"
            defaultValue={unit.status}
            className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {state.errors?.status?.[0] ? <p className="text-sm text-red-600">{state.errors.status[0]}</p> : null}
        </label>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-[14px] border border-[var(--color-dormmate-primary)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-dormmate-primary)] transition hover:bg-[var(--color-dormmate-surface)]">Cancel Edit</button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Saving unit..." : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}