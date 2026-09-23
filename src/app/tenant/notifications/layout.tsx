import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

export default async function NotificationsLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("notifications");
  return children;
}