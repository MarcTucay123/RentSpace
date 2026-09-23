import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireTenantAccess } from "@/lib/auth/utils";
import { getTenantNavigationCounts } from "@/lib/navigation/counts";
import { getTenantAssignmentSummary } from "@/lib/tenant/data";
import { getEnabledFeatureKeys } from "@/lib/features/access";

function formatAssignmentLabel(assignment: Awaited<ReturnType<typeof getTenantAssignmentSummary>>) {
  if (!assignment?.unitName) return null;
  if (assignment.assignmentType === "bed_space") return `${assignment.unitName} • Room: ${assignment.roomNumber ?? "—"} • ${assignment.bedLabel ?? "Bed space"}`;
  if (assignment.assignmentType === "room_space") return `${assignment.unitName} • Room: ${assignment.roomNumber ?? "—"}`;
  return assignment.unitName;
}

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireTenantAccess();
  const [counts, assignment, enabledFeatures] = await Promise.all([
    getTenantNavigationCounts(profile.id),
    getTenantAssignmentSummary(profile.id),
    getEnabledFeatureKeys(profile),
  ]);

  return (
    <AppShell
      profile={profile}
      profileAssignmentLabel={formatAssignmentLabel(assignment)}
      title="Tenant Dashboard"
      subtitle="Your rental and dormitory information"
      navItems={[
        enabledFeatures.has("dashboard") ? { href: "/tenant/dashboard", label: "Dashboard" } : null,
        enabledFeatures.has("my_rental") ? { href: "/tenant/my-rental", label: "My Rental" } : null,
        enabledFeatures.has("maintenance") ? { href: "/tenant/maintenance", label: "Maintenance" } : null,
        enabledFeatures.has("messages") ? { href: "/tenant/messages", label: "Messages", badgeCount: counts.unreadMessages } : null,
        enabledFeatures.has("notifications") ? { href: "/tenant/notifications", label: "Notifications", badgeCount: counts.unreadNotifications } : null,
        { href: "/profile", label: "Profile Settings" },
      ].filter((item): item is NonNullable<typeof item> => item !== null)}
    >
      {children}
    </AppShell>
  );
}