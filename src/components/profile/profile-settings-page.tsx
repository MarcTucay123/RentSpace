import Link from "next/link";

import type { Profile } from "@/lib/auth/types";
import { getRoleHomePath } from "@/lib/auth/utils";

import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";
import { ProfilePhotoForm } from "./profile-photo-form";

type ProfileSettingsPageProps = {
  profile: Profile;
  assignmentLabel?: string | null;
};

export function ProfileSettingsPage({ profile, assignmentLabel }: ProfileSettingsPageProps) {
  const dashboardPath = getRoleHomePath(profile.role);

  return (
    <div className="min-h-screen bg-[var(--color-dormmate-bg)] px-4 py-6 text-[var(--color-dormmate-text)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[1.75rem] border border-[var(--color-dormmate-border)] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-dormmate-primary)]">
              Profile Settings
            </p>
            <Link
              href={dashboardPath}
              className="inline-flex items-center gap-2 rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-dormmate-primary)] transition hover:border-[var(--color-dormmate-primary)] hover:bg-[var(--color-dormmate-green-soft)]"
            >
              <span aria-hidden="true">←</span>
              Back to Dashboard
            </Link>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Manage your RentSpace account</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-dormmate-muted)] sm:text-base">
            Update your personal information, start the secure email change flow, upload your profile photo, and change your password.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <ProfileForm profile={profile} />
          <ProfilePhotoForm profile={profile} assignmentLabel={assignmentLabel} />
        </div>

        <PasswordForm />
      </div>
    </div>
  );
}