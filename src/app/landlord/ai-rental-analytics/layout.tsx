import type { ReactNode } from "react";

import { requireFeatureAccess } from "@/lib/features/access";

/** Uses the existing AI entitlement for the dedicated analytics module. */
export default async function AiRentalAnalyticsLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("ai_assistant");
  return children;
}