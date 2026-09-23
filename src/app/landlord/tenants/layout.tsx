import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

export default async function TenantsLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("tenants");
  return children;
}