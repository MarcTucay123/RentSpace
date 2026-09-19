import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import type { UserRole } from "@/lib/auth/types";

const roleConfig: Record<UserRole, { label: string; description: string }> = {
  admin: {
    label: "Admin",
    description: "Sign in to the RentSpace admin portal for landlord approvals and system-level oversight.",
  },
  landlord: {
    label: "Landlord",
    description: "Sign in to manage your properties, units, tenants, and operational workflows.",
  },
  tenant: {
    label: "Tenant",
    description: "Sign in to access your approved tenant account, dashboard, and personal records.",
  },
};

type RoleLoginPageProps = {
  params: Promise<{ role: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const errorMessages: Record<string, string> = {
  pending: "Your account is still pending approval.",
  rejected: "Your registration was rejected. Please contact support for assistance.",
  inactive: "Your account is inactive. Please contact support.",
  unauthorized: "You are not authorized to access that page.",
  "missing-profile": "Your profile could not be found. Please contact support.",
};

export default async function RoleLoginPage({ params, searchParams }: RoleLoginPageProps) {
  const [{ role }, query] = await Promise.all([params, searchParams]);

  if (role !== "admin") {
    notFound();
  }

  const typedRole = "admin" as UserRole;
  const config = roleConfig[typedRole];
  const error = typeof query.error === "string" ? errorMessages[query.error] : undefined;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title={`${config.label} login`}
      description="Sign in to your secure admin workspace to continue."
      compactCard
      formOnly
      narrowForm
      footer={
        <div className="space-y-2">
          <p className="text-sm">
            Tenant or landlord?{" "}
            <Link href="/login" className="font-semibold text-[#315a57] hover:underline">
              Return to main login
            </Link>
          </p>
        </div>
      }
    >
      <LoginForm role={typedRole} initialMessage={error} />
    </AuthShell>
  );
}