"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createUnit } from "@/app/actions/units";
import { FormStatus } from "@/components/auth/form-status";
import { TextField } from "@/components/auth/text-field";
import type { UnitFormState } from "@/lib/units/types";

const initialState: UnitFormState = {};

export function UnitCreateForm() {
  const [state, action, pending] = useActionState(createUnit, initialState);
  const [unitCategory, setUnitCategory] = useState("bed_space");

  return (
    <section className="rounded-[1.35rem] border border-[var(--color-dormmate-border)] bg-white p-4 shadow-sm sm:p-5">
      <div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">
            Add Unit
          </p>
          <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">Create a rental unit</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-dormmate-muted)]">
            Create the top-level unit first. Rooms and bed spaces are managed after the unit is created.
          </p>
        </div>
      </div>

      <form action={action} className="mt-6 space-y-4">
        <FormStatus message={state.message} success={state.success} />

        <TextField label="Unit Name / Number" name="unitName" required error={state.errors?.unitName?.[0]} />

        <label className="block space-y-2">
          <span className="text-sm font-medium">Unit Category</span>
          <select
            name="unitCategory"
            className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]"
            defaultValue="bed_space"
            onChange={(event) => setUnitCategory(event.target.value)}
          >
            <option value="bed_space">Bed Space Unit</option>
            <option value="room_space">Room Space Unit</option>
            <option value="apartment">Apartment Unit</option>
          </select>
          {state.errors?.unitCategory?.[0] ? <p className="text-sm text-red-600">{state.errors.unitCategory[0]}</p> : null}
        </label>

        {unitCategory === "apartment" ? (
          <div>
            <TextField label="Apartment Rental Rate (Optional)" name="rentalRate" type="number" error={state.errors?.rentalRate?.[0]} />
            <p className="mt-1 text-xs text-[var(--color-dormmate-muted)]">Used as the default monthly rent for this Apartment Unit.</p>
          </div>
        ) : <input type="hidden" name="rentalRate" value="" />}

        <label className="block space-y-2">
          <span className="text-sm font-medium">Description / Notes (Optional)</span>
          <textarea
            name="description"
            rows={4}
            className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Status</span>
          <select
            name="status"
            className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]"
            defaultValue="active"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {state.errors?.status?.[0] ? <p className="text-sm text-red-600">{state.errors.status[0]}</p> : null}
        </label>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/landlord/units" className="inline-flex rounded-[14px] border border-[var(--color-dormmate-primary)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-dormmate-primary)] shadow-sm transition hover:bg-[var(--color-dormmate-surface)]">
            Cancel Unit
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Creating unit..." : "Create Unit"}
          </button>
        </div>
      </form>
    </section>
  );
}