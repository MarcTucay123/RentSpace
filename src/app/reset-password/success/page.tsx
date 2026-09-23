import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = {
  title: "Password Updated | RentSpace",
};

type ResetPasswordSuccessPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordSuccessPage({ searchParams }: ResetPasswordSuccessPageProps) {
  const params = await searchParams;
  const loginPath = params.role === "admin" ? "/login/admin" : "/login";

  return (
    <AuthShell
      eyebrow="Password updated"
      title="Your password has been changed"
      description="Your new password is ready to use. Sign in again to continue to your workspace."
      compactCard
      formOnly
      narrowForm
    >
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700" aria-hidden="true">
          ✓
        </div>
        <p className="text-sm leading-6 text-[#607b77]">
          For your security, your recovery session has ended. Use your new password the next time you sign in.
        </p>
        <Link href={loginPath} className="brand-button block w-full rounded-2xl px-5 py-3.5 text-center text-base font-semibold text-white">
          Return to Login
        </Link>
      </div>
    </AuthShell>
  );
}