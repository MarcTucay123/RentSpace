import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

export default async function MyRentalLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("my_rental");
  return children;
}