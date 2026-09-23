import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireAdminAccess } from "@/lib/auth/utils";
import { getAdminNavigationCounts } from "@/lib/navigation/counts";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireAdminAccess();
  const counts = await getAdminNavigationCounts();

  return (
    <AppShell
      profile={profile}
      title="Admin Portal"
      subtitle="System-level oversight for RentSpace deployments and landlord onboarding."
      navItems={[
        { href: "/admin/dashboard", label: "Dashboard" },
        { href: "/admin/users", label: "Manage User Accounts" },
        { href: "/admin/user-control", label: "User Control" },
        { href: "/admin/landlords", label: "Registration Approvals", badgeCount: counts.registrationApprovals },
        { href: "/profile", label: "Profile Settings" },
      ]}
    >
      {children}
    </AppShell>
  );
}