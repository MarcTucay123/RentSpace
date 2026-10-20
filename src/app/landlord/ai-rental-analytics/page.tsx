import { redirect } from "next/navigation";

/** Preserves old bookmarks after analytics interpretation moved into the AI Assistant. */
export default function AiRentalAnalyticsRedirectPage() {
  redirect("/landlord/ai-assistant");
}