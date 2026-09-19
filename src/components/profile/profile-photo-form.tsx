"use client";
import { useState, useTransition } from "react";

import { uploadProfilePhoto } from "@/app/actions/profile-photo";
import type { Profile } from "@/lib/auth/types";

import { FormStatus } from "@/components/auth/form-status";
import { ProfileAvatar } from "@/components/profile/profile-avatar";

type ProfilePhotoFormProps = {
  profile: Profile;
  assignmentLabel?: string | null;
};

export function ProfilePhotoForm({ profile, assignmentLabel }: ProfilePhotoFormProps) {
  const [message, setMessage] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-[1.75rem] border border-[var(--color-dormmate-border)] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-dormmate-primary)]">
          Profile Photo
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Upload your avatar</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-dormmate-muted)]">
          Recommended for personal account identification. Files are intended to be stored in Supabase Storage under a protected profile photo bucket.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <ProfileAvatar photoUrl={profile.profile_photo_url} name={`${profile.first_name} ${profile.last_name}`} assignmentLabel={profile.role === "tenant" ? assignmentLabel ?? "No current assignment" : `${profile.role.charAt(0).toUpperCase()}${profile.role.slice(1)} account`} assignmentPrefix={profile.role === "tenant" ? "Assigned to" : "Account"} className="h-24 w-24 text-2xl" />
          <div className="text-sm text-[var(--color-dormmate-muted)]">
            JPG, PNG, or WEBP. Max 2MB. Uploads are stored using your own user path.
          </div>
        </div>

        <FormStatus message={message} success={success} />

        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await uploadProfilePhoto(formData);
              setMessage(result.message);
              setSuccess(Boolean(result.success));
            });
          }}
          className="space-y-4"
        >
          <input
            type="file"
            name="profilePhoto"
            accept="image/png,image/jpeg,image/jpg,image/webp,.jpg,.jpeg,.png,.webp"
            className="block w-full rounded-2xl border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-4 py-3 text-sm"
          />

          <button
            type="submit"
            disabled={isPending}
            className="rounded-2xl bg-[var(--color-dormmate-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Uploading..." : "Upload Photo"}
          </button>
        </form>
      </div>
    </section>
  );
}