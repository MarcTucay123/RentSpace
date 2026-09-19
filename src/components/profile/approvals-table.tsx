"use client";

import { useCallback, useState, useTransition } from "react";

import { approveLandlord, approveTenant, rejectLandlord, rejectTenant } from "@/app/actions/auth";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { Profile } from "@/lib/auth/types";

type ApprovalsTableProps = {
  profiles: Profile[];
  mode?: "tenant" | "landlord";
};

type PendingConfirmation = {
  profile: Profile;
  action: "approve" | "reject";
} | null;

export function ApprovalsTable({ profiles, mode = "tenant" }: ApprovalsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<PendingConfirmation>(null);
  const isLandlordMode = mode === "landlord";
  const accountType = isLandlordMode ? "landlord" : "tenant";

  const closeConfirmation = useCallback(() => {
    if (!isPending) setConfirmation(null);
  }, [isPending]);

  const confirmAction = () => {
    if (!confirmation) return;

    const { profile, action } = confirmation;
    startTransition(async () => {
      if (action === "approve") {
        await (isLandlordMode ? approveLandlord(profile.id) : approveTenant(profile.id));
      } else {
        await (isLandlordMode ? rejectLandlord(profile.id) : rejectTenant(profile.id));
      }
      setConfirmation(null);
    });
  };

  return (
    <section className="rounded-[1.35rem] border border-[var(--color-dormmate-border)] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">
            {isLandlordMode ? "Landlord Approvals" : "Tenant Approvals"}
          </p>
          <h2 className="mt-2 text-[1.45rem] font-semibold tracking-tight sm:text-[1.65rem]">Pending registrations</h2>
          <p className="mt-2 text-sm text-[var(--color-dormmate-muted)]">
            {isLandlordMode
              ? "Review new landlord accounts before granting dashboard access."
              : "Review new tenant accounts before granting portal access."}
          </p>
        </div>
        <div className="text-sm text-[var(--color-dormmate-muted)]">
          {profiles.length} pending registration{profiles.length === 1 ? "" : "s"}
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] p-5 text-sm text-[var(--color-dormmate-muted)]">
          {isLandlordMode
            ? "There are no pending landlord registrations at the moment."
            : "There are no pending tenant registrations at the moment."}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-[var(--color-dormmate-border)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-dormmate-border)] text-left text-sm">
              <thead className="bg-[var(--color-dormmate-surface)] text-[var(--color-dormmate-muted)]">
                <tr>
                  {[
                    "First Name",
                    "Middle Name",
                    "Last Name",
                    "Mobile",
                    "Email",
                    "Registered",
                    "Status",
                    "Actions",
                  ].map((label) => (
                    <th key={label} className="px-3 py-2.5 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-dormmate-border)] bg-white">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="align-top">
                    <td className="px-3 py-3">{profile.first_name}</td>
                    <td className="px-3 py-3">{profile.middle_name ?? "—"}</td>
                    <td className="px-3 py-3">{profile.last_name}</td>
                    <td className="px-3 py-3">{profile.mobile_number}</td>
                    <td className="px-3 py-3">{profile.email ?? "—"}</td>
                    <td className="px-3 py-3">{new Date(profile.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                        {profile.account_status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setConfirmation({ profile, action: "approve" })}
                          className="rounded-[12px] bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setConfirmation({ profile, action: "reject" })}
                          className="rounded-[12px] border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-70"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ConfirmationModal
        open={confirmation !== null}
        title={confirmation?.action === "reject" ? `Reject ${accountType} registration?` : `Approve ${accountType} registration?`}
        description={
          confirmation
            ? confirmation.action === "reject"
              ? `${confirmation.profile.first_name} ${confirmation.profile.last_name} will not be granted access to the ${accountType} portal.`
              : `${confirmation.profile.first_name} ${confirmation.profile.last_name} will be granted access to the ${accountType} portal.`
            : ""
        }
        confirmLabel={confirmation?.action === "reject" ? "Reject" : "Approve"}
        tone={confirmation?.action === "reject" ? "danger" : "positive"}
        pending={isPending}
        onCancel={closeConfirmation}
        onConfirm={confirmAction}
      />
    </section>
  );
}