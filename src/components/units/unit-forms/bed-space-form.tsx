"use client";

import { useActionState } from "react";

import { createBedSpace, updateBedSpace } from "@/app/actions/units";
import { FormStatus } from "@/components/auth/form-status";
import { TextField } from "@/components/auth/text-field";
import type { BedSpace, UnitFormState, UnitListItem } from "@/lib/units/types";

type BedSpaceFormProps = {
  unit: UnitListItem;
  roomId: string;
  existingBedSpace?: BedSpace;
  onSuccess?: () => void;
};

const initialState: UnitFormState = {};

export function BedSpaceForm({ unit, roomId, existingBedSpace, onSuccess }: BedSpaceFormProps) {
  const actionFn = existingBedSpace ? updateBedSpace : createBedSpace;
  async function saveAndClose(previousState: UnitFormState, formData: FormData) {
    const result = await actionFn(previousState, formData);
    if (result.success) onSuccess?.();
    return result;
  }
  const [state, action, pending] = useActionState(saveAndClose, initialState);

  return (
    <form action={action} className="space-y-4">
      {!existingBedSpace ? (
        <div>
          <h5 className="text-sm font-semibold text-[var(--color-dormmate-text)]">Add Bed Space</h5>
          <p className="text-xs text-[var(--color-dormmate-muted)]">Create another bed space inside this room.</p>
        </div>
      ) : null}

      <FormStatus message={state.message} success={state.success} />
      <input type="hidden" name="unitId" value={unit.id} />
      <input type="hidden" name="roomId" value={roomId} />
      {existingBedSpace ? <input type="hidden" name="bedSpaceId" value={existingBedSpace.id} /> : null}

      <TextField label="Bed Space Label" name="bedLabel" defaultValue={existingBedSpace?.bed_label} required error={state.errors?.bedLabel?.[0]} />
      <TextField label="Rental Rate (Optional)" name="rentalRate" type="number" defaultValue={existingBedSpace?.rental_rate?.toString() ?? ""} error={state.errors?.rentalRate?.[0]} />
      <p className="rounded-[12px] bg-[var(--color-dormmate-surface)] px-3 py-2.5 text-xs leading-5 text-[var(--color-dormmate-muted)]">Availability is automatic: assigning a Tenant marks this bed occupied, and moving the Tenant out makes it available again.</p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Saving..." : existingBedSpace ? "Save Bed Space" : "Create Bed Space"}
      </button>
    </form>
  );
}