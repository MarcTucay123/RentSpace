import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireTenantAccess } from "@/lib/auth/utils";
import { getTenantNavigationCounts } from "@/lib/navigation/counts";
import { getTenantAssignmentSummary } from "@/lib/tenant/data";

function formatAssignmentLabel(assignment: Awaited<ReturnType<typeof getTenantAssignmentSummary>>) {
  if (!assignment?.unitName) return null;
  if (assignment.assignmentType === "bed_space") return `${assignment.unitName} • Room: ${assignment.roomNumber ?? "—"} • ${assignment.bedLabel ?? "Bed space"}`;
  if (assignment.assignmentType === "room_space") return `${assignment.unitName} • Room: ${assignment.roomNumber ?? "—"}`;
  return assignment.unitName;
}

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireTenantAccess();
  const [counts, assignment] = await Promise.all([
    getTenantNavigationCounts(profile.id),
    getTenantAssignmentSummary(profile.id),
  ]);

  return (
    <AppShell
      profile={profile}
      profileAssignmentLabel={formatAssignmentLabel(assignment)}
      title="Tenant Dashboard"
      subtitle="Your rental and dormitory information"
      navItems={[
        { href: "/tenant/dashboard", label: "Dashboard" },
        { href: "/tenant/my-rental", label: "My Rental" },
        { href: "/tenant/maintenance", label: "Maintenance" },
        { href: "/tenant/messages", label: "Messages", badgeCount: counts.unreadMessages },
        { href: "/tenant/notifications", label: "Notifications", badgeCount: counts.unreadNotifications },
        { href: "/profile", label: "Profile Settings" },
      ]}
    >
      {children}
    </AppShell>
  );
}