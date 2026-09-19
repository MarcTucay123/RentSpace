"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { createClient } from "@/utils/supabase/client";

const refreshDelayMs = 500;

export function PortalAutoRefresh({ profileId }: { profileId: string }) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        router.refresh();
      }, refreshDelayMs);
    };

    const channel = supabase
      .channel(`portal-refresh-${profileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        scheduleRefresh,
      )
      .subscribe((status, error) => {
        if (
          process.env.NODE_ENV === "development" &&
          (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
        ) {
          console.warn("RentSpace realtime refresh subscription interrupted:", status, error);
        }
      });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }

      if (hiddenAt.current !== null && Date.now() - hiddenAt.current >= 5_000) {
        scheduleRefresh();
      }
      hiddenAt.current = null;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [profileId, router]);

  return null;
}