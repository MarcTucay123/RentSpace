"use server";

import { revalidatePath } from "next/cache";

import type { AuthFormState, UserRole } from "@/lib/auth/types";
import { requireAdminAccess } from "@/lib/auth/utils";
import { getFeaturesForRole, isFeatureForRole } from "@/lib/features/config";
import { createClient } from "@/utils/supabase/server";

export async function updateUserFeatureControl(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { profile: adminProfile } = await requireAdminAccess();
  const profileId = String(formData.get("profileId") ?? "").trim();
  const featureKey = String(formData.get("featureKey") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "true";

  if (!profileId || !featureKey) {
    return { success: false, message: "Select a valid user and feature." };
  }

  const supabase = await createClient();
  const { data: target, error: targetError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", profileId)
    .in("role", ["landlord", "tenant"])
    .maybeSingle();

  if (targetError || !target) {
    return { success: false, message: "The selected account could not be found." };
  }

  if (!isFeatureForRole(target.role as UserRole, featureKey)) {
    return { success: false, message: "That feature is not available for the selected role." };
  }

  const { error } = await supabase.from("user_feature_controls").upsert(
    {
      profile_id: profileId,
      feature_key: featureKey,
      enabled,
      updated_by: adminProfile.id,
    },
    { onConflict: "profile_id,feature_key" },
  );

  if (error) return { success: false, message: "Unable to update the feature control." };

  revalidatePath("/admin/user-control");
  revalidatePath(`/${target.role}`, "layout");
  return { success: true, message: `${enabled ? "Enabled" : "Disabled"} successfully.` };
}

export async function disableAllUserFeatures(
  _previousState: AuthFormState,
  _formData: FormData,
): Promise<AuthFormState> {
  void _previousState;
  void _formData;
  const { profile: adminProfile } = await requireAdminAccess();
  const supabase = await createClient();
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, role")
    .in("role", ["landlord", "tenant"]);

  if (usersError) return { success: false, message: "Unable to load the controlled accounts." };

  const controls = (users ?? []).flatMap((user) =>
    getFeaturesForRole(user.role as UserRole).map((feature) => ({
      profile_id: user.id,
      feature_key: feature.key,
      enabled: false,
      updated_by: adminProfile.id,
    })),
  );

  if (controls.length === 0) {
    return { success: true, message: "There are no Landlord or Tenant features to disable." };
  }

  const { error } = await supabase
    .from("user_feature_controls")
    .upsert(controls, { onConflict: "profile_id,feature_key" });

  if (error) return { success: false, message: "Unable to turn off all user features." };

  revalidatePath("/admin/user-control");
  revalidatePath("/landlord", "layout");
  revalidatePath("/tenant", "layout");
  return { success: true, message: `Turned off ${controls.length} feature access setting${controls.length === 1 ? "" : "s"}.` };
}