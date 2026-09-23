import { cookies } from "next/headers";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Reset Password | RentSpace",
};

const passwordRecoveryCookie = "dormmate-password-recovery";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const recoveryUserId = (await cookies()).get(passwordRecoveryCookie)?.value;
  const validRecovery = Boolean(data.user && recoveryUserId === data.user.id);

  return (
    <AuthShell
      eyebrow="Secure password reset"
      title="Create a new password"
      description="Choose a strong password you haven’t used for this account before."
      compactCard
      formOnly
      narrowForm
    >
      <ResetPasswordForm validRecovery={validRecovery} />
    </AuthShell>
  );
}