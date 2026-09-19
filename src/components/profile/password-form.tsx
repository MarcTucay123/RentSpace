"use client";

import { useActionState } from "react";

import { updatePassword } from "@/app/actions/auth";
import type { ProfileFormState } from "@/lib/auth/types";

import { FormStatus } from "@/components/auth/form-status";
import { TextField } from "@/components/auth/text-field";

const initialState: ProfileFormState = {};

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);

  return (
    <section className="rounded-[1.75rem] border border-[var(--color-dormmate-border)] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-dormmate-primary)]">
          Security
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Change password</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-dormmate-muted)]">
          Your password is updated securely and is never stored in public RentSpace tables.
        </p>
      </div>

      <form action={action} className="mt-6 space-y-5">
        <FormStatus message={state.message} success={state.success} />

        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Current Password" name="currentPassword" type="password" required error={state.errors?.currentPassword?.[0]} autoComplete="current-password" rightAdornment="Show" />
          <TextField label="New Password" name="newPassword" type="password" required error={state.errors?.newPassword?.[0]} autoComplete="new-password" />
          <TextField label="Confirm New Password" name="confirmNewPassword" type="password" required error={state.errors?.confirmNewPassword?.[0]} autoComplete="new-password" />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl bg-[var(--color-dormmate-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Updating password..." : "Update Password"}
        </button>
      </form>
    </section>
  );
}