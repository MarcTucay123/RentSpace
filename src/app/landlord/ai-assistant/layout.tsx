import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

export default async function AiAssistantLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("ai_assistant");
  return children;
}