"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

type UploadState = {
  success?: boolean;
  message?: string;
};

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxFileSize = 2 * 1024 * 1024;

export async function uploadProfilePhoto(formData: FormData): Promise<UploadState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You need to log in again to upload a profile photo." };
  }

  const file = formData.get("profilePhoto");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Please choose an image file to upload." };
  }

  if (!allowedTypes.has(file.type)) {
    return { success: false, message: "Only PNG, JPG, and WEBP images are allowed." };
  }

  if (file.size > maxFileSize) {
    return { success: false, message: "Profile photo must be 2MB or smaller." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `${user.id}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return {
      success: false,
      message: `Profile photo upload failed: ${uploadError.message}. Apply migration 20260916_004_profile_photo_storage.sql to the connected Supabase project, then try again.`,
    };
  }

  const { data: publicUrlData } = supabase.storage.from("profile-photos").getPublicUrl(storagePath);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ profile_photo_url: publicUrlData.publicUrl })
    .eq("id", user.id);

  if (profileError) {
    return { success: false, message: "Your photo uploaded, but the profile record could not be updated." };
  }

  revalidatePath("/profile");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/users");
  revalidatePath("/landlord/dashboard");
  revalidatePath("/landlord/tenants");
  revalidatePath("/landlord/rent-monitoring");
  revalidatePath("/landlord/payments");
  revalidatePath("/landlord/messages");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/messages");
  revalidatePath("/admin", "layout");
  revalidatePath("/landlord", "layout");
  revalidatePath("/tenant", "layout");

  return { success: true, message: "Profile photo uploaded successfully." };
}