import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Login | RentSpace",
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const errorMessages: Record<string, string> = {
  pending: "Your account is still pending approval.",
  rejected: "Your registration was rejected. Please contact support for assistance.",
  inactive: "Your account is inactive. Please contact support.",
  unauthorized: "You are not authorized to access that page.",
  "missing-profile": "Your profile could not be found. Please contact support.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const roleParam = typeof params.role === "string" ? params.role : "tenant";
  const publicRole = roleParam === "admin" ? "admin" : roleParam === "landlord" ? "landlord" : "tenant";
  const roleLabel = publicRole;
  const error = typeof params.error === "string" ? errorMessages[params.error] : undefined;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to RentSpace"
      description={`Sign in to your ${roleLabel} workspace to continue.`}
      compactCard
      formOnly
      narrowForm
      footer={
        <div className="space-y-2">
          <div className="h-px w-full bg-[#dce7e4]" />
          <p className="pt-3 text-sm text-[#607b77]">
            New {roleLabel}?{" "}
            <Link href={`/register?role=${publicRole}`} className="font-semibold text-[#315a57] hover:underline">
              {publicRole === "admin" ? "Register as an Admin" : `Create ${roleLabel} account`}
            </Link>
          </p>
        </div>
      }
    >
      <div className="space-y-5">
        <LoginForm role={publicRole} initialMessage={error} />
      </div>
    </AuthShell>
  );
}