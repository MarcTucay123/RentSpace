import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireTenantAccess } from "@/lib/auth/utils";
import { getTenantNavigationCounts } from "@/lib/navigation/counts";
import { getEnabledFeatureKeys } from "@/lib/features/access";

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireTenantAccess();
  const [counts, enabledFeatures] = await Promise.all([
    getTenantNavigationCounts(profile.id),
    getEnabledFeatureKeys(profile),
  ]);

  return (
    <AppShell
      profile={profile}
      title="Tenant Dashboard"
      subtitle="Your rental and dormitory information"
      navItems={[
        { href: "/tenant/dashboard", label: "Dashboard" },
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