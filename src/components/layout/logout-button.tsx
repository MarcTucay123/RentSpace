"use client";

import { useTransition } from "react";

import { logout } from "@/app/actions/auth";

export function LogoutButton({ dark = false }: { dark?: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => void logout())}
      disabled={isPending}
      className={`w-full rounded-[14px] px-4 py-2.5 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${dark ? "text-[#dce8e5] hover:bg-white/10 hover:text-white" : "text-[#415a77] hover:bg-[var(--color-dormmate-green-soft)] hover:font-semibold hover:text-[#1b263b]"}`}
    >
      {isPending ? "Signing out..." : "Sign Out"}
    </button>
  );
}