"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

type UploadState = {
  success?: boolean;
  message?: string;
  photoUrl?: string;
};

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;

function normalizeImageFile(file: File) {
  const rawExtension = file.name.split(".").pop()?.toLowerCase();
  const rawMimeType = file.type.toLowerCase();
  const mimeType = rawMimeType === "image/jpg" || rawMimeType === "image/pjpeg"
    ? "image/jpeg"
    : rawMimeType || (rawExtension === "png" ? "image/png" : rawExtension === "webp" ? "image/webp" : rawExtension === "jpg" || rawExtension === "jpeg" ? "image/jpeg" : "");
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : rawExtension;

  return { extension: extension || "jpg", mimeType };
}

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

  const normalizedFile = normalizeImageFile(file);

  if (!allowedTypes.has(normalizedFile.mimeType)) {
    return { success: false, message: "Only PNG, JPG, and WEBP images are allowed." };
  }

  if (file.size > maxFileSize) {
    return { success: false, message: "Profile photo must be 10MB or smaller." };
  }

  const storagePath = `${user.id}/avatar`;
  const avatarVersion = Date.now();

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(storagePath, file, {
      cacheControl: "31536000",
      upsert: true,
      contentType: normalizedFile.mimeType,
    });

  if (uploadError) {
    const normalizedError = uploadError.message.toLowerCase();
    const message = normalizedError.includes("bucket") && normalizedError.includes("not found")
      ? "Profile photo storage is not configured yet. Apply the profile photo storage migration to the connected Supabase project."
      : normalizedError.includes("mime") || normalizedError.includes("content type")
        ? "This image format was not accepted. Please choose a JPG, PNG, or WEBP image."
        : normalizedError.includes("maximum") || normalizedError.includes("too large") || normalizedError.includes("payload")
          ? "The profile photo is too large. Please choose an image that is 10MB or smaller."
          : "Profile photo upload failed. Please try again.";
    return {
      success: false,
      message,
    };
  }

  const { data: publicUrlData } = supabase.storage.from("profile-photos").getPublicUrl(storagePath);
  const versionedPhotoUrl = `${publicUrlData.publicUrl}?v=${avatarVersion}`;

  const { error: profileError } = await supabase
    .from("users")
    .update({ profile_photo_url: versionedPhotoUrl })
    .eq("id", user.id);

  if (profileError) {
    return { success: false, message: "Your photo uploaded, but the profile record could not be updated." };
  }

  const { data: avatarFiles, error: listError } = await supabase.storage
    .from("profile-photos")
    .list(user.id, { limit: 1000 });
  let cleanupMessage: string | undefined;

  if (listError) {
    cleanupMessage = "Profile photo updated, but old photo cleanup could not be verified. Please try uploading again later.";
  } else {
    const oldAvatarPaths = (avatarFiles ?? [])
      .filter((avatarFile) => avatarFile.name !== "avatar")
      .map((avatarFile) => `${user.id}/${avatarFile.name}`);

    if (oldAvatarPaths.length > 0) {
      const { error: removeError } = await supabase.storage.from("profile-photos").remove(oldAvatarPaths);
      if (removeError) {
        cleanupMessage = "Profile photo updated, but a previous legacy file could not be deleted. Please try uploading again later.";
      }
    }
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

  return {
    success: true,
    message: cleanupMessage ?? "Profile photo uploaded successfully.",
    photoUrl: versionedPhotoUrl,
  };
}
