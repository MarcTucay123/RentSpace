import { requireLandlordAccess } from "@/lib/auth/utils";
import { ApprovalsTable } from "@/components/profile/approvals-table";
import { createClient } from "@/utils/supabase/server";

import type { Profile } from "@/lib/auth/types";

export const metadata = {
  title: "Pending Registrations | RentSpace",
};

export default async function LandlordApprovalsPage() {
  await requireLandlordAccess();
  const supabase = await createClient();

  const { data: pendingProfiles, error } = await supabase
    .from("users")
    .select("id, first_name, middle_name, last_name, mobile_number, email, role, account_status, profile_photo_url, created_at, updated_at")
    .eq("role", "tenant")
    .eq("account_status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <section className="rounded-[1.35rem] border border-[#f0d49d] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b47718]">Tenant Approvals</p>
        <h2 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-[var(--color-dormmate-text-strong)] sm:text-[1.65rem]">
          Approval queue setup required
        </h2>
        <div className="mt-4 rounded-[1rem] bg-[#fff8e7] p-4 text-sm leading-6 text-[var(--color-dormmate-muted)]">
          <p>
            The landlord dashboard is available, but permission to read pending Tenant registrations is not yet installed in the connected Supabase project.
          </p>
          <p className="mt-2">
            Run <span className="font-semibold text-[var(--color-dormmate-text-strong)]">20260907_006_consolidated_registration_approvals.sql</span> in the Supabase SQL Editor, then refresh this page.
          </p>
          {error.code ? <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#a66f12]">Diagnostic code: {error.code}</p> : null}
        </div>
      </section>
    );
  }

  return <ApprovalsTable profiles={(pendingProfiles as Profile[] | null) ?? []} mode="tenant" />;
}