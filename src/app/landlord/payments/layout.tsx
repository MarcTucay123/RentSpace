import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

export default async function PaymentsLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("payments");
  return children;
}