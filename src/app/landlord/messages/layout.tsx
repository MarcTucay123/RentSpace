import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

export default async function MessagesLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("messages");
  return children;
}