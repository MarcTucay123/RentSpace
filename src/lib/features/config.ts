import type { UserRole } from "@/lib/auth/types";

export const landlordFeatures = [
  { key: "dashboard", label: "Dashboard", href: "/landlord/dashboard" },
  { key: "approvals", label: "Approvals", href: "/landlord/approvals" },
  { key: "units", label: "Units", href: "/landlord/units" },
  { key: "tenants", label: "Tenants", href: "/landlord/tenants" },
  { key: "rent_monitoring", label: "Rent Monitoring", href: "/landlord/rent-monitoring" },
  { key: "payments", label: "Payments", href: "/landlord/payments" },
  { key: "maintenance", label: "Maintenance", href: "/landlord/maintenance" },
  { key: "messages", label: "Messages", href: "/landlord/messages" },
  { key: "notifications", label: "Notifications", href: "/landlord/notifications" },
  { key: "reports", label: "Reports", href: "/landlord/reports" },
  { key: "ai_assistant", label: "AI Assistant", href: "/landlord/ai-assistant" },
] as const;

export const tenantFeatures = [
  { key: "dashboard", label: "Dashboard", href: "/tenant/dashboard" },
  { key: "my_rental", label: "My Rental", href: "/tenant/my-rental" },
  { key: "maintenance", label: "Maintenance", href: "/tenant/maintenance" },
  { key: "messages", label: "Messages", href: "/tenant/messages" },
  { key: "notifications", label: "Notifications", href: "/tenant/notifications" },
] as const;

export type LandlordFeatureKey = (typeof landlordFeatures)[number]["key"];
export type TenantFeatureKey = (typeof tenantFeatures)[number]["key"];
export type FeatureKey = LandlordFeatureKey | TenantFeatureKey;

export function getFeaturesForRole(role: UserRole) {
  if (role === "landlord") return landlordFeatures;
  if (role === "tenant") return tenantFeatures;
  return [];
}

export function isFeatureForRole(role: UserRole, featureKey: string): featureKey is FeatureKey {
  return getFeaturesForRole(role).some((feature) => feature.key === featureKey);
}