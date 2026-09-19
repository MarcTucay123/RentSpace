import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireLandlordAccess } from "@/lib/auth/utils";
import { getLandlordNavigationCounts } from "@/lib/navigation/counts";

export default async function LandlordLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireLandlordAccess();
  const counts = await getLandlordNavigationCounts(profile.id);

  return (
    <AppShell
      profile={profile}
      title="Landlord Portal"
      subtitle="Manage units, approvals, and rental setup in a laptop-friendly RentSpace workspace."
      navItems={[
        { href: "/landlord/dashboard", label: "Dashboard" },
        { href: "/landlord/approvals", label: "Approvals", badgeCount: counts.tenantApprovals },
        { href: "/landlord/units", label: "Units" },
        { href: "/landlord/tenants", label: "Tenants" },
        { href: "/landlord/rent-monitoring", label: "Rent Monitoring", badgeCount: counts.overdueRent },
        { href: "/landlord/payments", label: "Payments", badgeCount: counts.pendingPayments },
        { href: "/landlord/maintenance", label: "Maintenance" },
        { href: "/landlord/messages", label: "Messages", badgeCount: counts.unreadMessages },
        { href: "/landlord/notifications", label: "Notifications", badgeCount: counts.unreadNotifications },
        { href: "/landlord/reports", label: "Reports" },
        { href: "/landlord/ai-assistant", label: "AI Assistant" },
        { href: "/profile", label: "Profile Settings" },
      ]}
    >
      {children}
    </AppShell>
  );
}