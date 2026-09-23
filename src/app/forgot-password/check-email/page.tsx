import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = {
  title: "Check Your Email | RentSpace",
};

type CheckEmailPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const params = await searchParams;
  const role = params.role === "admin" ? "admin" : params.role === "landlord" ? "landlord" : "tenant";
  const loginPath = role === "admin" ? "/login/admin" : `/login?role=${role}`;

  return (
    <AuthShell
      eyebrow="Email sent"
      title="Check your email"
      description="Follow the secure link in the email to choose a new password."
      compactCard
      formOnly
      narrowForm
    >
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e4efed] text-3xl" aria-hidden="true">
          ✉
        </div>
        <div>
          <p className="text-xl font-bold tracking-[-0.025em] text-[#294d4b]">Password reset link sent</p>
          <p className="mt-2 text-sm leading-6 text-[#607b77]">
            If an account exists for that email address, you&apos;ll receive a password reset link shortly. Check your inbox and spam folder, then click the link to continue.
          </p>
        </div>
        <Link href={loginPath} className="inline-flex font-semibold text-[#315a57] hover:underline">
          Return to login
        </Link>
      </div>
    </AuthShell>
  );
}