import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

export default async function ApprovalsLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("approvals");
  return children;
}