import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

export default async function ReportsLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("reports");
  return children;
}