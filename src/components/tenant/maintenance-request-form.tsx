"use client";

import { useActionState } from "react";

import { submitMaintenanceRequest } from "@/app/actions/tenant";

type MaintenanceFormState = {
  success?: boolean;
  message?: string;
};

const initialState: MaintenanceFormState = {};

export function MaintenanceRequestForm() {
  const [state, action, pending] = useActionState(submitMaintenanceRequest, initialState);

  return (
    <form action={action} className="space-y-4">
      {state.message ? (
        <div
          className={`rounded-[20px] px-5 py-4 text-sm ${
            state.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-[#1b263b]">Location</span>
          <input
            name="location"
            placeholder="Room 101 / Shared Bathroom"
            className="w-full rounded-[14px] border border-[#e0e1dd] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#778da9] focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]"
            required
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-[#1b263b]">Category</span>
          <select
            name="category"
            defaultValue="Plumbing"
            className="w-full rounded-[14px] border border-[#e0e1dd] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]"
          >
            <option>Plumbing</option>
            <option>Electrical</option>
            <option>Furniture</option>
            <option>Cleaning</option>
            <option>Security</option>
            <option>Other</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-[#1b263b]">Description</span>
        <textarea
          name="description"
          placeholder="Describe the issue clearly so it can be resolved faster."
          className="min-h-[130px] w-full rounded-[14px] border border-[#e0e1dd] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#778da9] focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]"
          required
        />
      </label>

      <label className="block space-y-1.5">
        <span className="block text-sm font-semibold text-[#1b263b]">Attach photos</span>
        <input name="maintenancePhotos" type="file" multiple accept="image/png,image/jpeg,image/jpg,image/webp,.jpg,.jpeg,.png,.webp" className="block w-full rounded-[14px] border border-[#e0e1dd] bg-[var(--color-dormmate-green-soft)] px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:font-semibold file:text-[#1b263b]" />
        <span className="block text-xs text-[var(--color-dormmate-muted)]">Optional • PNG, JPG, or WEBP • up to 3 photos • maximum 5MB each</span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full bg-[#fff1c9] px-3 py-1.5 text-xs font-semibold text-[#c08a26]">
          Status: Pending
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-[14px] bg-[#1b263b] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {pending ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </form>
  );
}