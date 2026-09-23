import type { ReactNode } from "react";

import { requireFeatureAccess } from "@/lib/features/access";

export default async function LandlordDashboardLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("dashboard");
  return children;
}