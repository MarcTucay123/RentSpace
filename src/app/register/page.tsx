import { RegisterForm } from "@/components/auth/register-form";
import { AuthShell } from "@/components/auth/auth-shell";
import type { RegistrationRole } from "@/lib/auth/types";

export const metadata = {
  title: "Register | RentSpace",
};

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const role: RegistrationRole = params.role === "admin" ? "admin" : params.role === "landlord" ? "landlord" : "tenant";
  const roleLabel = role === "admin" ? "Admin" : role === "landlord" ? "Landlord" : "Tenant";

  return (
    <AuthShell
      eyebrow={`${roleLabel} Registration`}
      title={`Create your ${roleLabel.toLowerCase()} account`}
      description={role === "admin" ? "Your account stays pending until an existing Admin approves it." : role === "landlord" ? "Your account stays pending until an Admin approves it." : "Your account stays pending until a Landlord approves it."}
      compactCard
      formOnly
    >
      <RegisterForm role={role} />
    </AuthShell>
  );
}