import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import type { UserRole } from "@/lib/auth/types";

export const metadata = {
  title: "Forgot Password | RentSpace",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const roleValue = typeof params.role === "string" ? params.role : "tenant";
  const role: UserRole = roleValue === "admin" ? "admin" : roleValue === "landlord" ? "landlord" : "tenant";
  const loginPath = role === "admin" ? "/login/admin" : `/login?role=${role}`;
  const initialMessage = params.error === "invalid-link"
    ? "That password reset link is invalid or has expired. Please request a new one."
    : undefined;

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot your password?"
      description="We’ll help you securely regain access to your RentSpace account."
      compactCard
      formOnly
      narrowForm
      footer={
        <p>
          Remembered your password?{" "}
          <Link href={loginPath} className="font-semibold text-[#315a57] hover:underline">
            Return to login
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm role={role} initialMessage={initialMessage} />
    </AuthShell>
  );
}