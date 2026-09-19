"use client";

import { useActionState } from "react";

import { createAdminAccount } from "@/app/actions/auth";
import { FormStatus } from "@/components/auth/form-status";
import { TextField } from "@/components/auth/text-field";
import type { AuthFormState } from "@/lib/auth/types";

const initialState: AuthFormState = {};

export function CreateAdminForm() {
  const [state, action, pending] = useActionState(createAdminAccount, initialState);

  return (
    <section className="rounded-[18px] bg-white p-6 shadow-[var(--shadow)] sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-dormmate-primary)]">
        Create Admin Account
      </p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight">Provision an additional Admin</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--color-dormmate-muted)]">
        This creates the Auth account and matching profile entirely through RentSpace. No manual Supabase Users page step is required after the first Admin.
      </p>

      <form action={action} className="mt-6 space-y-5">
        <FormStatus message={state.message} success={state.success} />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First Name" name="firstName" required error={state.errors?.firstName?.[0]} />
          <TextField label="Middle Name (Optional)" name="middleName" error={state.errors?.middleName?.[0]} />
        </div>

        <TextField label="Last Name" name="lastName" required error={state.errors?.lastName?.[0]} />
        <TextField label="Mobile Number" name="mobileNumber" required error={state.errors?.mobileNumber?.[0]} />
        <TextField label="Email Address" name="email" type="email" required error={state.errors?.email?.[0]} />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Temporary Password" name="password" type="password" required error={state.errors?.password?.[0]} />
          <TextField label="Confirm Temporary Password" name="confirmPassword" type="password" required error={state.errors?.confirmPassword?.[0]} />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--color-dormmate-primary-dark,#415a77)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-dormmate-primary)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Creating Admin..." : "Create Admin Account"}
        </button>
      </form>
    </section>
  );
}