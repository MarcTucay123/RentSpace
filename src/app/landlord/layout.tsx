import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireLandlordAccess } from "@/lib/auth/utils";
import { getLandlordNavigationCounts } from "@/lib/navigation/counts";
import { getEnabledFeatureKeys } from "@/lib/features/access";

export default async function LandlordLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireLandlordAccess();
  const [counts, enabledFeatures] = await Promise.all([
    getLandlordNavigationCounts(profile.id),
    getEnabledFeatureKeys(profile),
  ]);

  return (
    <AppShell
      profile={profile}
      title="Landlord Portal"
      subtitle="Manage units, approvals, and rental setup in a laptop-friendly RentSpace workspace."
      navItems={[
        { href: "/landlord/dashboard", label: "Dashboard" },
        enabledFeatures.has("approvals") ? { href: "/landlord/approvals", label: "Approvals", badgeCount: counts.tenantApprovals } : null,
        enabledFeatures.has("units") ? { href: "/landlord/units", label: "Units" } : null,
        enabledFeatures.has("tenants") ? { href: "/landlord/tenants", label: "Tenants" } : null,
        enabledFeatures.has("rent_monitoring") ? { href: "/landlord/rent-monitoring", label: "Rent Monitoring", badgeCount: counts.overdueRent } : null,
        enabledFeatures.has("payments") ? { href: "/landlord/payments", label: "Payments", badgeCount: counts.pendingPayments } : null,
        enabledFeatures.has("maintenance") ? { href: "/landlord/maintenance", label: "Maintenance" } : null,
        enabledFeatures.has("messages") ? { href: "/landlord/messages", label: "Messages", badgeCount: counts.unreadMessages } : null,
        enabledFeatures.has("notifications") ? { href: "/landlord/notifications", label: "Notifications", badgeCount: counts.unreadNotifications } : null,
        enabledFeatures.has("reports") ? { href: "/landlord/reports", label: "Reports" } : null,
        enabledFeatures.has("ai_assistant") ? { href: "/landlord/ai-assistant", label: "AI Assistant" } : null,
        { href: "/profile", label: "Profile Settings" },
      ].filter((item): item is NonNullable<typeof item> => item !== null)}
    >
      {children}
    </AppShell>
  );
}