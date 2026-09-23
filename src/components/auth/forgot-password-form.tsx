"use client";

import { useActionState } from "react";

import { requestPasswordReset } from "@/app/actions/auth";
import { FormStatus } from "@/components/auth/form-status";
import { TextField } from "@/components/auth/text-field";
import type { AuthFormState, UserRole } from "@/lib/auth/types";

const initialState: AuthFormState = {};

export function ForgotPasswordForm({ role, initialMessage }: { role: UserRole; initialMessage?: string }) {
  const [state, action, pending] = useActionState(requestPasswordReset, {
    ...initialState,
    message: initialMessage,
  });

  return (
    <form action={action} className="space-y-5">
      <div>
        <p className="text-xl font-bold tracking-[-0.025em] text-[#294d4b]">Reset your password</p>
        <p className="mt-1 text-sm leading-6 text-[#607b77]">
          Enter your account email and we&apos;ll send you a secure password reset link.
        </p>
      </div>

      <FormStatus message={state.message} success={state.success} />
      <input type="hidden" name="role" value={role} />
      <TextField
        label="Email address"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="name@email.com"
        error={state.errors?.email?.[0]}
      />

      <button
        type="submit"
        disabled={pending}
        className="brand-button w-full rounded-2xl px-5 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Sending reset link..." : "Send Reset Link"}
      </button>
    </form>
  );
}