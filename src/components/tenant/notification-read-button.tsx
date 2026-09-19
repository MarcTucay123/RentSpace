"use client";

import { useTransition } from "react";

import { markNotificationAsRead } from "@/app/actions/tenant";

export function NotificationReadButton({ notificationId }: { notificationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => void markNotificationAsRead(notificationId))}
      disabled={pending}
      className="text-left text-sm font-semibold text-[#0d1b2a] transition hover:text-[#1b263b] disabled:opacity-70"
    >
      {pending ? "Opening..." : "Open related page"}
    </button>
  );
}