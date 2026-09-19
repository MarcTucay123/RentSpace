"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerAccount } from "@/app/actions/auth";
import type { AuthFormState, RegistrationRole } from "@/lib/auth/types";

import { FormStatus } from "./form-status";
import { TextField } from "./text-field";

const initialState: AuthFormState = {};

type RegisterFormProps = {
  role: RegistrationRole;
};

export function RegisterForm({ role }: RegisterFormProps) {
  const [state, action, pending] = useActionState(registerAccount, initialState);
  const roleLabel = role === "landlord" ? "Landlord" : "Tenant";
  const approvalLabel = role === "landlord" ? "Admin Approval" : "Landlord Approval";

  return (
    <form action={action} className="space-y-4 sm:space-y-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-[-0.02em] text-[#294d4b] sm:text-[1.7rem]">Account details</h2>
          <p className="mt-1.5 text-xs leading-5 text-[#607b77] sm:mt-2 sm:text-sm">
            Complete the form to request {roleLabel.toLowerCase()} access.
          </p>
        </div>
        <div className="shrink-0 rounded-full bg-[#fff3ca] px-3 py-1.5 text-xs font-bold text-[#946b00] sm:px-4 sm:py-2 sm:text-sm">{roleLabel}</div>
      </div>

      <FormStatus message={state.message} success={state.success} />

      <input type="hidden" name="registrationRole" value={role} />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="First Name" name="firstName" required error={state.errors?.firstName?.[0]} autoComplete="given-name" placeholder="Enter first name" />
        <TextField label="Middle Name (Optional)" name="middleName" error={state.errors?.middleName?.[0]} autoComplete="additional-name" placeholder="Enter middle name" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Last Name" name="lastName" required error={state.errors?.lastName?.[0]} autoComplete="family-name" placeholder="Enter last name" />
        <TextField label="Email Address" name="email" type="email" required error={state.errors?.email?.[0]} autoComplete="email" placeholder="name@email.com" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Contact Number" name="mobileNumber" required placeholder="09xx xxx xxxx" error={state.errors?.mobileNumber?.[0]} autoComplete="tel" />
        <div className="rounded-[18px] border border-[#ead58e] bg-[#fff7db] px-5 py-5">
          <p className="text-xs font-semibold uppercase text-[#607b77] sm:text-sm">Initial account status</p>
          <p className="mt-2 text-base font-bold uppercase text-[#946b00] sm:text-[1.1rem]">Pending {approvalLabel}</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Password" name="password" type="password" required error={state.errors?.password?.[0]} autoComplete="new-password" placeholder="Create password" />
        <TextField label="Confirm password" name="confirmPassword" type="password" required error={state.errors?.confirmPassword?.[0]} autoComplete="new-password" placeholder="Repeat password" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="brand-button mx-auto block w-full max-w-[760px] rounded-[18px] px-5 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Submitting registration..." : "Submit Registration"}
      </button>

      <p className="text-center text-base text-[var(--color-dormmate-muted)]">
        Already registered?{" "}
        <Link href={`/login?role=${role}`} className="font-semibold text-[#315a57] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}