"use client";

import { useActionState } from "react";

import { createRoom, updateRoom } from "@/app/actions/units";
import { FormStatus } from "@/components/auth/form-status";
import { TextField } from "@/components/auth/text-field";
import { getUnitCategoryLabel, type Room, type UnitFormState, type UnitListItem } from "@/lib/units/types";

type RoomFormProps = {
  unit: UnitListItem;
  existingRoom?: Room;
  compact?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
};

const initialState: UnitFormState = {};

export function RoomForm({ unit, existingRoom, compact = false, onCancel, onSuccess }: RoomFormProps) {
  const actionFn = existingRoom ? updateRoom : createRoom;
  async function saveAndClose(previousState: UnitFormState, formData: FormData) {
    const result = await actionFn(previousState, formData);
    if (result.success) onSuccess?.();
    return result;
  }
  const [state, action, pending] = useActionState(saveAndClose, initialState);

  return (
    <section
      className={compact ? "" : "rounded-[1.35rem] border border-[var(--color-dormmate-border)] bg-white p-4 shadow-sm sm:p-5"}
    >
      {!compact ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">
            {existingRoom ? "Edit Room" : unit.unit_category === "bed_space" ? "Add Room and Generate Bed Spaces" : "Add Room"}
          </p>
          <h3 className="mt-2 text-[1.45rem] font-semibold tracking-tight sm:text-[1.6rem]">
            {existingRoom ? `Update ${existingRoom.room_number}` : `Manage ${getUnitCategoryLabel(unit.unit_category)} rooms`}
          </h3>
        </>
      ) : null}

      <form action={action} className={compact ? "space-y-4" : "mt-5 space-y-4"}>
        <FormStatus message={state.message} success={state.success} />
        <input type="hidden" name="unitId" value={unit.id} />
        <input type="hidden" name="unitCategory" value={unit.unit_category} />
        {existingRoom ? <input type="hidden" name="roomId" value={existingRoom.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Room Name"
            name="roomNumber"
            defaultValue={existingRoom?.room_number}
            required
            error={state.errors?.roomNumber?.[0]}
          />
          <TextField
            label="Rental Rate (Optional)"
            name="rentalRate"
            type="number"
            defaultValue={existingRoom?.rental_rate?.toString() ?? ""}
            error={state.errors?.rentalRate?.[0]}
          />
        </div>

        {!existingRoom && unit.unit_category === "bed_space" ? (
          <TextField
            label="Number of Bed Spaces"
            name="bedSpaceCount"
            type="number"
            defaultValue="1"
            required
            error={state.errors?.bedSpaceCount?.[0]}
          />
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium">Status</span>
          <select
            name="status"
            defaultValue={existingRoom?.status ?? "active"}
            className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {state.errors?.status?.[0] ? <p className="text-sm text-red-600">{state.errors.status[0]}</p> : null}
        </label>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-[14px] border border-[var(--color-dormmate-primary)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-dormmate-primary)] transition hover:bg-[var(--color-dormmate-surface)]">{existingRoom ? "Cancel Edit" : "Cancel Room"}</button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Saving room..." : existingRoom ? "Save Changes" : "Create Room"}
          </button>
        </div>
      </form>
    </section>
  );
}