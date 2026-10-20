import { redirect } from "next/navigation";

/** Preserves old analytics bookmarks after merging analytics into the main dashboard. */
export default function LegacyAiRentalAnalyticsPage() {
  redirect("/landlord/dashboard");
}