import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

export default async function RentMonitoringLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("rent_monitoring");
  return children;
}