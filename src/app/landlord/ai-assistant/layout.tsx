import type { ReactNode } from "react";
import { requireFeatureAccess } from "@/lib/features/access";

/** Prevents accounts with a disabled AI Assistant feature from opening this module. */
export default async function AiAssistantLayout({ children }: { children: ReactNode }) {
  await requireFeatureAccess("ai_assistant");
  return children;
}