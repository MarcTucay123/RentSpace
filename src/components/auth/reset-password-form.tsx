"use client";

import Link from "next/link";
import { useActionState } from "react";

import { resetRecoveredPassword } from "@/app/actions/auth";
import { FormStatus } from "@/components/auth/form-status";
import { TextField } from "@/components/auth/text-field";
import type { AuthFormState } from "@/lib/auth/types";

const initialState: AuthFormState = {};

export function ResetPasswordForm({ validRecovery }: { validRecovery: boolean }) {
  const [state, action, pending] = useActionState(resetRecoveredPassword, initialState);

  if (!validRecovery) {
    return (
      <div className="space-y-5">
        <FormStatus message="This password reset link is invalid or has expired. Please request a new one." />
        <Link href="/forgot-password" className="brand-button block w-full rounded-2xl px-5 py-3.5 text-center text-base font-semibold text-white">
          Request New Reset Link
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <p className="text-xl font-bold tracking-[-0.025em] text-[#294d4b]">Choose a new password</p>
        <p className="mt-1 text-sm leading-6 text-[#607b77]">
          Use at least 8 characters with a letter, number, and special character.
        </p>
      </div>

      <FormStatus message={state.message} success={state.success} />
      <TextField label="New password" name="newPassword" type="password" required autoComplete="new-password" error={state.errors?.newPassword?.[0]} rightAdornment="Show" />
      <TextField label="Confirm new password" name="confirmPassword" type="password" required autoComplete="new-password" error={state.errors?.confirmPassword?.[0]} rightAdornment="Show" />

      <button
        type="submit"
        disabled={pending}
        className="brand-button w-full rounded-2xl px-5 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Updating password..." : "Update Password"}
      </button>
    </form>
  );
}