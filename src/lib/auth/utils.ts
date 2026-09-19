import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

import type { Profile } from "./types";

type ProfileRow = Profile;

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentProfile() {
  const user = await getSessionUser();

  if (!user) {
    return { user: null, profile: null } as const;
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load your profile at this time.");
  }

  return { user, profile: profile as ProfileRow | null } as const;
}

export async function requireAuthenticatedProfile() {
  const { user, profile } = await getCurrentProfile();

  if (!user) {
    redirect("/login");
  }

  if (!profile) {
    redirect("/login?error=missing-profile");
  }

  return { user, profile };
}

export async function requireTenantAccess() {
  const { user, profile } = await requireAuthenticatedProfile();

  if (profile.role !== "tenant") {
    redirect("/login?error=unauthorized");
  }

  if (profile.account_status !== "approved") {
    redirect(`/login?error=${profile.account_status}`);
  }

  return { user, profile };
}

export async function requireAdminAccess() {
  const { user, profile } = await requireAuthenticatedProfile();

  if (profile.role !== "admin") {
    redirect("/login?error=unauthorized");
  }

  if (profile.account_status !== "approved") {
    redirect(`/login?error=${profile.account_status}`);
  }

  return { user, profile };
}

export async function requireLandlordAccess() {
  const { user, profile } = await requireAuthenticatedProfile();

  if (profile.role !== "landlord") {
    redirect("/login?error=unauthorized");
  }

  if (profile.account_status !== "approved") {
    redirect(`/login?error=${profile.account_status}`);
  }

  return { user, profile };
}

export function getDisplayName(profile: Pick<Profile, "first_name" | "last_name">) {
  return `${profile.first_name} ${profile.last_name}`.trim();
}

export function getRoleHomePath(role: Profile["role"]) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "landlord") return "/landlord/dashboard";
  return "/tenant/dashboard";
}