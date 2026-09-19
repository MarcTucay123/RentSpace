"use client";

import { useActionState } from "react";

import { updateProfile } from "@/app/actions/auth";
import type { Profile, ProfileFormState } from "@/lib/auth/types";

import { FormStatus } from "@/components/auth/form-status";
import { TextField } from "@/components/auth/text-field";

type ProfileFormProps = {
  profile: Profile;
};

const initialState: ProfileFormState = {};

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <section className="rounded-[1.75rem] border border-[var(--color-dormmate-border)] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-dormmate-primary)]">
          Personal Information
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Update your details</h2>
      </div>

      <form action={action} className="mt-6 space-y-5">
        <FormStatus message={state.message} success={state.success} />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First Name" name="firstName" defaultValue={profile.first_name} required error={state.errors?.firstName?.[0]} autoComplete="given-name" />
          <TextField label="Middle Name (Optional)" name="middleName" defaultValue={profile.middle_name ?? ""} error={state.errors?.middleName?.[0]} autoComplete="additional-name" />
        </div>

        <TextField label="Last Name" name="lastName" defaultValue={profile.last_name} required error={state.errors?.lastName?.[0]} autoComplete="family-name" />
        <TextField label="Mobile Number" name="mobileNumber" defaultValue={profile.mobile_number} required error={state.errors?.mobileNumber?.[0]} autoComplete="tel" />
        <TextField label="Email" name="email" type="email" defaultValue={profile.email ?? ""} required error={state.errors?.email?.[0]} autoComplete="email" />
        <input type="hidden" name="profilePhotoUrl" value={profile.profile_photo_url ?? ""} />

        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl bg-[var(--color-dormmate-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Saving changes..." : "Save Profile"}
        </button>
      </form>
    </section>
  );
}