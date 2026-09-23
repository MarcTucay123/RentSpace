"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import type {
  AuthFormState,
  Profile,
  ProfileFormState,
  RegistrationRole,
  UserRole,
} from "@/lib/auth/types";
import { getRoleHomePath, requireAdminAccess } from "@/lib/auth/utils";
import { requireFeatureAccess } from "@/lib/features/access";
import { capitalizeFirstLetter } from "@/lib/text/format";
import { createClient } from "@/utils/supabase/server";

const mobilePattern = /^(\+63|0)9\d{9}$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function normalizeName(value: FormDataEntryValue | null) {
  return capitalizeFirstLetter(normalizeText(value));
}

function validateRegistration(formData: FormData) {
  const registrationRole = normalizeText(formData.get("registrationRole")) as RegistrationRole;
  const firstName = normalizeName(formData.get("firstName"));
  const middleName = normalizeName(formData.get("middleName"));
  const lastName = normalizeName(formData.get("lastName"));
  const mobileNumber = normalizeText(formData.get("mobileNumber"));
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const errors: Record<string, string[]> = {};

  if (!["admin", "landlord", "tenant"].includes(registrationRole)) {
    errors.registrationRole = ["Select a valid registration role."];
  }
  if (!firstName) errors.firstName = ["First name is required."];
  if (!lastName) errors.lastName = ["Last name is required."];
  if (!mobilePattern.test(mobileNumber)) {
    errors.mobileNumber = ["Enter a valid Philippine mobile number (e.g. 09171234567 or +639171234567)."];
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ["Enter a valid email address."];
  }
  if (!passwordPattern.test(password)) {
    errors.password = ["Password must be at least 8 characters and include a letter, a number, and a special character."];
  }
  if (password !== confirmPassword) {
    errors.confirmPassword = ["Passwords do not match."];
  }
  return {
    registrationRole,
    firstName,
    middleName,
    lastName,
    mobileNumber,
    email,
    password,
    errors,
  };
}

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Missing server-side Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  return createAdminClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function registerAccount(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const {
    registrationRole,
    firstName,
    middleName,
    lastName,
    mobileNumber,
    email,
    password,
    errors,
  } = validateRegistration(formData);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, message: "Please correct the highlighted fields." };
  }

  if (registrationRole === "admin") {
    const adminClient = getServiceRoleClient();
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        mobile_number: mobileNumber,
        registration_role: "admin",
      },
    });

    if (error || !data.user) {
      return {
        success: false,
        message: error?.message.toLowerCase().includes("already")
          ? "An account with this email already exists."
          : "Unable to create the Admin account right now.",
      };
    }

    const { error: profileError } = await adminClient.from("users").upsert(
      {
        id: data.user.id,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        mobile_number: mobileNumber,
        email,
        role: "admin",
        account_status: "pending",
      },
      { onConflict: "id" },
    );

    if (profileError) {
      await adminClient.auth.admin.deleteUser(data.user.id);
      return { success: false, message: "Admin account provisioning failed and was rolled back." };
    }

    const { error: tenantProfileError } = await adminClient
      .from("tenant_profiles")
      .delete()
      .eq("profile_id", data.user.id);

    if (tenantProfileError) {
      await adminClient.auth.admin.deleteUser(data.user.id);
      return { success: false, message: "Admin account cleanup failed and was rolled back." };
    }

    return { success: true, message: "Registration submitted successfully. Your Admin account is pending approval by an existing Admin." };
  }

  const supabase = await createClient();

  // --- 1. Sign up with Supabase Auth ---
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        mobile_number: mobileNumber,
        registration_role: registrationRole,
      },
    },
  });

  if (signUpError) {
    console.error("Supabase registration error:", signUpError);
    let message = "Unable to complete registration right now. Please try again.";

    if (signUpError.message.toLowerCase().includes("already")) {
      message = "An account with this email already exists. Please log in instead.";
    } else if (signUpError.message.toLowerCase().includes("rate limit")) {
      message = "Too many registration attempts with this email. Please wait a few minutes before trying again, or use a different email address.";
    }

    return { success: false, message };
  }

  if (!signUpData.user) {
    return { success: false, message: "Registration could not be completed. Please try again." };
  }

  if (Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
    return {
      success: false,
      message: "An account with this email may already exist. Please sign in or use a different email address.",
    };
  }

  // The database auth-user trigger creates the profile and tenant profile in the
  // same transaction as signUp. Do not repeat those inserts here: confirmation
  // settings may leave this request without a session, and RLS would reject them.
  await supabase.auth.signOut();

  return {
    success: true,
    message:
      registrationRole === "landlord"
        ? "Registration submitted successfully. Your landlord account is pending Admin approval. "
        : "Registration submitted successfully. Your tenant account is pending Landlord approval. ",
  };
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const selectedRole = normalizeText(formData.get("role")) as UserRole;
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  const errors: Record<string, string[]> = {};
  if (!email) errors.email = ["Email is required."];
  if (!password) errors.password = ["Password is required."];

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, message: "Please enter your login details." };
  }

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

  if (authError) {
    return { success: false, message: "Invalid email or password. Please try again." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Unable to load your account. Please try again." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      success: false,
      message: "Your account profile could not be loaded. Please contact support.",
    };
  }

  const typedProfile = profile as Profile;

  if (typedProfile.role !== selectedRole) {
    await supabase.auth.signOut();
    return {
      success: false,
      message: `This account is not authorized for the selected ${selectedRole} portal.`,
    };
  }

  if (typedProfile.account_status !== "approved") {
    await supabase.auth.signOut();
    const statusMessage =
      typedProfile.account_status === "pending"
        ? typedProfile.role === "landlord"
          ? "Your landlord account is still pending Admin approval."
          : typedProfile.role === "tenant"
            ? "Your tenant account is still pending Landlord approval."
            : "Your admin account is pending approval."
        : typedProfile.account_status === "rejected"
          ? "Your registration was rejected. Please contact support."
          : "Your account is currently inactive. Please contact support.";

    return { success: false, message: statusMessage };
  }

  redirect(getRoleHomePath(typedProfile.role));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function approveLandlord(profileId: string) {
  await requireAdminAccess();
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("users")
    .update({ account_status: "approved" })
    .eq("id", profileId)
    .eq("role", "landlord")
    .eq("account_status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !updated) throw new Error(error?.message || "Unable to approve this landlord registration.");
  revalidatePath("/admin/landlords");
}

export async function approveAdmin(profileId: string) {
  const { profile } = await requireAdminAccess();
  if (profile.id === profileId) throw new Error("You cannot approve your own Admin registration.");

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("users")
    .update({ account_status: "approved" })
    .eq("id", profileId)
    .eq("role", "admin")
    .eq("account_status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !updated) throw new Error(error?.message || "Unable to approve this Admin registration.");
  revalidatePath("/admin/landlords");
  revalidatePath("/admin/dashboard");
}

export async function rejectAdmin(profileId: string) {
  const { profile } = await requireAdminAccess();
  if (profile.id === profileId) throw new Error("You cannot reject your own Admin registration.");

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("users")
    .update({ account_status: "rejected" })
    .eq("id", profileId)
    .eq("role", "admin")
    .eq("account_status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !updated) throw new Error(error?.message || "Unable to reject this Admin registration.");
  revalidatePath("/admin/landlords");
  revalidatePath("/admin/dashboard");
}

export async function rejectLandlord(profileId: string) {
  await requireAdminAccess();
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("users")
    .update({ account_status: "rejected" })
    .eq("id", profileId)
    .eq("role", "landlord")
    .eq("account_status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !updated) throw new Error(error?.message || "Unable to reject this landlord registration.");
  revalidatePath("/admin/landlords");
}

export async function approveTenant(profileId: string) {
  await requireFeatureAccess("approvals");
  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ account_status: "approved" })
    .eq("id", profileId)
    .eq("role", "tenant")
    .eq("account_status", "pending");

  if (error) throw new Error(error.message || "Unable to approve this tenant registration.");
  revalidatePath("/landlord/approvals");
}

export async function rejectTenant(profileId: string) {
  await requireFeatureAccess("approvals");
  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ account_status: "rejected" })
    .eq("id", profileId)
    .eq("role", "tenant")
    .eq("account_status", "pending");

  if (error) throw new Error(error.message || "Unable to reject this tenant registration.");
  revalidatePath("/landlord/approvals");
}

export async function manageUserAccount(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  await requireAdminAccess();
  const profileId = normalizeText(formData.get("profileId"));
  const operation = normalizeText(formData.get("operation"));
  if (!profileId || !["status", "remove"].includes(operation)) return { success: false, message: "Select a valid account action." };

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, role, account_status")
    .eq("id", profileId)
    .in("role", ["tenant", "landlord"])
    .maybeSingle();

  if (profileError || !profile) return { success: false, message: "The selected user account could not be found." };

  if (operation === "status") {
    const accountStatus = normalizeText(formData.get("accountStatus"));
    if (!["approved", "inactive"].includes(accountStatus)) return { success: false, message: "Select Active or Inactive." };

    const { error } = await supabase.from("users").update({ account_status: accountStatus }).eq("id", profileId);
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/users");
    revalidatePath("/admin/landlords");
    return { success: true, message: accountStatus === "approved" ? "Account activated." : "Account set to inactive." };
  }

  if (profile.role !== "tenant") return { success: false, message: "Only unassigned Tenant accounts can be removed here." };

  const { data: tenantProfile, error: tenantError } = await supabase.from("tenant_profiles").select("id").eq("profile_id", profileId).maybeSingle();
  if (tenantError) return { success: false, message: "Unable to verify this Tenant's assignment history." };

  if (tenantProfile) {
    const { count, error: assignmentError } = await supabase
      .from("tenant_assignments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_profile_id", tenantProfile.id);
    if (assignmentError) return { success: false, message: "Unable to verify this Tenant's assignment history." };
    if ((count ?? 0) > 0) return { success: false, message: "This Tenant has assignment history and cannot be removed. Set the account to Inactive instead." };
  }

  const adminClient = getServiceRoleClient();
  const { data: avatarFiles } = await adminClient.storage.from("profile-photos").list(profileId);
  if (avatarFiles?.length) {
    await adminClient.storage.from("profile-photos").remove(avatarFiles.map((file) => `${profileId}/${file.name}`));
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(profileId);
  if (deleteError) return { success: false, message: `Unable to remove the account: ${deleteError.message}` };

  revalidatePath("/admin/users");
  return { success: true, message: "Unassigned Tenant account removed." };
}

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You need to log in again to update your profile." };
  }

  const firstName = normalizeName(formData.get("firstName"));
  const middleName = normalizeName(formData.get("middleName"));
  const lastName = normalizeName(formData.get("lastName"));
  const mobileNumber = normalizeText(formData.get("mobileNumber"));
  const email = normalizeEmail(formData.get("email"));
  const profilePhotoUrl = normalizeText(formData.get("profilePhotoUrl"));

  const errors: Record<string, string[]> = {};
  if (!firstName) errors.firstName = ["First name is required."];
  if (!lastName) errors.lastName = ["Last name is required."];
  if (!mobilePattern.test(mobileNumber)) {
    errors.mobileNumber = ["Enter a valid Philippine mobile number."];
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ["Enter a valid email address."];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, message: "Please correct the highlighted fields." };
  }

  const { data: currentProfile, error: profileError } = await supabase
    .from("users")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { success: false, message: "Unable to load your profile right now." };
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      mobile_number: mobileNumber,
      profile_photo_url: profilePhotoUrl || null,
      email,
    })
    .eq("id", user.id);

  if (updateError) {
    return { success: false, message: "Unable to save your profile changes." };
  }

  let message = "Profile updated successfully.";
  let pendingEmail: string | undefined;

  if (email !== (currentProfile?.email ?? "")) {
    const { error: emailError } = await supabase.auth.updateUser({ email });

    if (emailError) {
      return {
        success: false,
        message: "Your profile was updated, but we could not start the email change process.",
      };
    }

    pendingEmail = email;
    message = "Profile updated. Please check your email to confirm the email address change.";
  }

  revalidatePath("/profile");
  return { success: true, message, pendingEmail };
}

export async function updatePassword(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmNewPassword = String(formData.get("confirmNewPassword") ?? "");

  const errors: Record<string, string[]> = {};
  if (!currentPassword) {
    errors.currentPassword = ["Enter your current password to confirm your identity."];
  }
  if (!passwordPattern.test(newPassword)) {
    errors.newPassword = ["Password must be at least 8 characters and include a letter, a number, and a special character."];
  }
  if (newPassword !== confirmNewPassword) {
    errors.confirmNewPassword = ["Passwords do not match."];
  }
  if (currentPassword && currentPassword === newPassword) {
    errors.newPassword = ["Your new password must be different from your current password."];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, message: "Please correct the password fields." };
  }

  const supabase = await createClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const email = userResult.user?.email;
  if (userError || !userResult.user || !email) {
    return { success: false, message: "You need to log in again before changing your password." };
  }

  const { data: signInResult, error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (signInError || signInResult.user?.id !== userResult.user.id) {
    return {
      success: false,
      errors: { currentPassword: ["The current password is incorrect."] },
      message: "Current password verification failed.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, message: "Unable to update your password right now." };
  }

  return { success: true, message: "Password updated successfully." };
}