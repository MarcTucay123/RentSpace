"use client";

import Link from "next/link";
import { useActionState } from "react";

import { login } from "@/app/actions/auth";
import type { AuthFormState, UserRole } from "@/lib/auth/types";

import { FormStatus } from "./form-status";
import { TextField } from "./text-field";

const initialState: AuthFormState = {};

type LoginFormProps = {
  role: UserRole;
  initialMessage?: string;
};

export function LoginForm({ role, initialMessage }: LoginFormProps) {
  const [state, action, pending] = useActionState(login, {
    ...initialState,
    message: initialMessage,
  });

  const isAdmin = role === "admin";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <form action={action} className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xl font-bold tracking-[-0.025em] text-[#294d4b]">Welcome back</p>
          <p className="mt-1 text-xs text-[#607b77] sm:text-sm">Enter your account credentials below.</p>
        </div>
        <span className="rounded-full bg-[#fff3ca] px-3 py-1.5 text-xs font-bold text-[#946b00]">{roleLabel}</span>
      </div>

      <FormStatus message={state.message} success={state.success} />

      <input type="hidden" name="role" value={role} />

      {isAdmin ? (
        <div className="space-y-2 rounded-2xl border border-[#ead58e] bg-[#fff7db] px-4 py-3 text-xs leading-5 text-[#765800] sm:text-sm">
          <p>Admin registrations require approval from an existing administrator before sign-in.</p>
          <Link href="/register?role=admin" className="inline-flex font-semibold text-[#315a57] hover:underline">
            Register as an Admin
          </Link>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#607b77]">Choose portal</p>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#e4efed] p-1">
          {[
            { value: "tenant", label: "Tenant" },
            { value: "landlord", label: "Landlord" },
          ].map((option) => {
            const isActive = role === option.value;
            return (
              <Link
                key={option.value}
                href={`/login?role=${option.value}`}
                className={`rounded-[12px] px-3 py-2.5 text-center text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#315a57] !text-white shadow-sm"
                    : "bg-transparent text-[#315a57] hover:bg-white/80 hover:text-[#294d4b]"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
          </div>
        </div>
      )}

      <TextField label="Email address" name="email" type="email" required autoComplete="email" error={state.errors?.email?.[0]} placeholder="name@email.com" />
      <TextField label="Password" name="password" type="password" required autoComplete="current-password" error={state.errors?.password?.[0]} rightAdornment="Show" />

      <button
        type="submit"
        disabled={pending}
        className="brand-button w-full rounded-2xl px-5 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}