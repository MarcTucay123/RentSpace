"use client";

import { useActionState } from "react";

import { updateUserFeatureControl } from "@/app/actions/feature-controls";
import type { AuthFormState } from "@/lib/auth/types";

const initialState: AuthFormState = {};

type FeatureToggleProps = {
  profileId: string;
  featureKey: string;
  enabled: boolean;
};

export function FeatureToggle({ profileId, featureKey, enabled }: FeatureToggleProps) {
  const [state, action, pending] = useActionState(updateUserFeatureControl, initialState);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="featureKey" value={featureKey} />
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`${enabled ? "Disable" : "Enable"} feature`}
        className={`relative h-7 w-12 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? "bg-emerald-600" : "bg-slate-300"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-6" : "left-1"}`} />
      </button>
      <span className={`min-w-14 text-xs font-semibold ${enabled ? "text-emerald-700" : "text-slate-500"}`}>
        {pending ? "Saving" : enabled ? "On" : "Off"}
      </span>
      {state.message ? <span className={`text-[11px] ${state.success ? "text-emerald-700" : "text-red-600"}`}>{state.message}</span> : null}
    </form>
  );
}