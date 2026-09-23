import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

export default async function UnitsLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("units");
  return children;
}