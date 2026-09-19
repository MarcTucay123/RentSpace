import { createClient } from "@/utils/supabase/server";
import { requireAdminAccess } from "@/lib/auth/utils";
import { ApprovalsTable } from "@/components/profile/approvals-table";

import type { Profile } from "@/lib/auth/types";

export const metadata = {
  title: "Landlord Approvals | RentSpace",
};

export default async function AdminLandlordsPage() {
  await requireAdminAccess();
  const supabase = await createClient();

  const { data: pendingProfiles, error } = await supabase
    .from("users")
    .select("id, first_name, middle_name, last_name, mobile_number, email, role, account_status, profile_photo_url, created_at, updated_at")
    .eq("role", "landlord")
    .eq("account_status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Unable to load pending landlord registrations:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Unable to load pending landlord registrations${error.code ? ` (${error.code})` : ""}.`);
  }

  return <ApprovalsTable profiles={(pendingProfiles as Profile[] | null) ?? []} mode="landlord" />;
}