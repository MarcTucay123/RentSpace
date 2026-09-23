import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

export default async function MaintenanceLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("maintenance");
  return children;
}