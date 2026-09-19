"use client";

import { useTransition } from "react";

import { markAllLandlordNotificationsAsRead } from "@/app/actions/landlord";

export function LandlordNotificationMarkAllButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() => startTransition(() => void markAllLandlordNotificationsAsRead())}
      className="rounded-[12px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Updating..." : "Mark All as Read"}
    </button>
  );
}