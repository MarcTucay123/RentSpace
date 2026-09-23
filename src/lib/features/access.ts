import { redirect } from "next/navigation";

import type { Profile } from "@/lib/auth/types";
import { requireAuthenticatedProfile } from "@/lib/auth/utils";
import { createClient } from "@/utils/supabase/server";

import { getFeaturesForRole, isFeatureForRole, type FeatureKey } from "./config";

export async function getEnabledFeatureKeys(profile: Pick<Profile, "id" | "role">) {
  const availableFeatures = getFeaturesForRole(profile.role);
  const enabled = new Set<FeatureKey>(availableFeatures.map((feature) => feature.key));

  if (availableFeatures.length === 0) return enabled;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_feature_controls")
    .select("feature_key, enabled")
    .eq("profile_id", profile.id);

  if (error) throw new Error("Unable to load this account's feature controls.");

  for (const control of data ?? []) {
    if (isFeatureForRole(profile.role, control.feature_key) && !control.enabled) {
      enabled.delete(control.feature_key);
    }
  }

  return enabled;
}

export async function requireFeatureAccess(featureKey: FeatureKey) {
  const { user, profile } = await requireAuthenticatedProfile();

  if (profile.account_status !== "approved") {
    redirect(`/login?error=${profile.account_status}`);
  }

  if (!isFeatureForRole(profile.role, featureKey)) {
    redirect("/login?error=unauthorized");
  }

  const enabledFeatures = await getEnabledFeatureKeys(profile);
  if (!enabledFeatures.has(featureKey)) {
    redirect(`/${profile.role}/dashboard?notice=feature-disabled`);
  }

  return { user, profile };
}