"use server";

import { revalidatePath } from "next/cache";

import { requireTenantAccess } from "@/lib/auth/utils";
import { createClient } from "@/utils/supabase/server";

export type TenantActionState = {
  success?: boolean;
  message?: string;
};

const allowedProofTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxProofSize = 5 * 1024 * 1024;
const maxMaintenancePhotos = 3;

export async function submitPaymentProof(
  _previousState: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  const { profile } = await requireTenantAccess();
  const supabase = await createClient();
  const obligationId = String(formData.get("rentalObligationId") ?? "").trim();
  const file = formData.get("paymentProof");

  if (!obligationId || !(file instanceof File) || file.size === 0) return { success: false, message: "Choose a payment proof image." };
  if (!allowedProofTypes.has(file.type)) return { success: false, message: "Only PNG, JPG, and WEBP proof images are allowed." };
  if (file.size > maxProofSize) return { success: false, message: "Payment proof must be 5MB or smaller." };

  const { data: tenantProfile } = await supabase.from("tenant_profiles").select("id").eq("profile_id", profile.id).maybeSingle();
  if (!tenantProfile) return { success: false, message: "Unable to locate your Tenant record." };

  const { data: obligation, error: obligationError } = await supabase
    .from("rental_obligations")
    .select("id, amount_due, amount_paid, payment_status, tenant_assignment_id")
    .eq("id", obligationId)
    .maybeSingle();
  if (obligationError || !obligation) return { success: false, message: "Your current rent obligation could not be found." };

  const { data: assignment } = await supabase.from("tenant_assignments").select("tenant_profile_id, status").eq("id", obligation.tenant_assignment_id).maybeSingle();
  if (!assignment || assignment.tenant_profile_id !== tenantProfile.id || assignment.status !== "active") return { success: false, message: "This rent obligation does not belong to your active assignment." };
  if (obligation.payment_status === "paid") return { success: false, message: "This monthly rent is already paid." };
  if (obligation.payment_status === "pending_verification") return { success: false, message: "Your existing payment proof is already awaiting review." };

  const amount = Math.max(Number(obligation.amount_due) - Number(obligation.amount_paid), 0);
  if (amount <= 0) return { success: false, message: "There is no outstanding balance for this obligation." };

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `${profile.id}/${obligation.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return { success: false, message: "Proof upload failed. Run migration 20260915_003 in Supabase and try again." };

  const { error: submitError } = await supabase.rpc("submit_tenant_payment_proof", {
    p_rental_obligation_id: obligation.id,
    p_amount: amount,
    p_payment_date: new Date().toISOString().slice(0, 10),
    p_storage_path: storagePath,
    p_original_file_name: file.name,
    p_mime_type: file.type,
  });
  if (submitError) {
    await supabase.storage.from("payment-proofs").remove([storagePath]);
    return { success: false, message: submitError.code === "PGRST202" || submitError.code === "42883" ? "Payment proof submission is not installed yet. Run migration 20260915_003 in Supabase." : submitError.message };
  }

  revalidatePath("/tenant/my-rental");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/landlord/payments");
  revalidatePath("/landlord/rent-monitoring");
  revalidatePath("/landlord", "layout");
  return { success: true, message: "Payment proof submitted. It is now awaiting Landlord verification." };
}

export async function submitMaintenanceRequest(
  _prevState: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  const { profile } = await requireTenantAccess();
  const supabase = await createClient();

  const location = String(formData.get("location") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const photos = formData.getAll("maintenancePhotos").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!location || !category || !description) {
    return { success: false, message: "Please complete the location, category, and description fields." };
  }
  if (photos.length > maxMaintenancePhotos) return { success: false, message: "Upload no more than 3 maintenance photos." };
  for (const photo of photos) {
    if (!allowedProofTypes.has(photo.type)) return { success: false, message: "Maintenance photos must be PNG, JPG, or WEBP images." };
    if (photo.size > maxProofSize) return { success: false, message: "Each maintenance photo must be 5MB or smaller." };
  }

  const { data: tenantProfile, error: tenantProfileError } = await supabase
    .from("tenant_profiles")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (tenantProfileError || !tenantProfile) {
    return { success: false, message: "Unable to locate your tenant record." };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("tenant_assignments")
    .select("unit_id, room_id, bed_space_id")
    .eq("tenant_profile_id", tenantProfile.id)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignmentError || !assignment) {
    return { success: false, message: "You need an active rental assignment before submitting a maintenance request." };
  }

  const requestFolderId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  const originalFileNames: string[] = [];
  const mimeTypes: string[] = [];

  for (const photo of photos) {
    const extension = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const storagePath = `${profile.id}/${requestFolderId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("maintenance-photos").upload(storagePath, photo, { contentType: photo.type, upsert: false });
    if (uploadError) {
      if (uploadedPaths.length) await supabase.storage.from("maintenance-photos").remove(uploadedPaths);
      return { success: false, message: "Maintenance photo upload failed. Apply migration 20260916_007 in Supabase, then try again." };
    }
    uploadedPaths.push(storagePath);
    originalFileNames.push(photo.name);
    mimeTypes.push(photo.type);
  }

  const { error } = await supabase.rpc("submit_tenant_maintenance_request", {
    p_location: location,
    p_category: category,
    p_description: description,
    p_storage_paths: uploadedPaths,
    p_original_file_names: originalFileNames,
    p_mime_types: mimeTypes,
  });

  if (error) {
    if (uploadedPaths.length) await supabase.storage.from("maintenance-photos").remove(uploadedPaths);
    return { success: false, message: error.code === "PGRST202" || error.code === "42883" ? "Maintenance photo submission is not installed yet. Apply migration 20260916_007 in Supabase." : error.message };
  }

  revalidatePath("/tenant/maintenance");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/landlord/maintenance");

  return { success: true, message: "Your maintenance request was submitted successfully." };
}

export async function markNotificationAsRead(notificationId: string) {
  const { profile } = await requireTenantAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_profile_id", profile.id);

  if (error) {
    throw new Error("Unable to mark this notification as read.");
  }

  revalidatePath("/tenant/notifications");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant", "layout");
}

export async function markAllTenantNotificationsAsRead() {
  const { profile } = await requireTenantAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_profile_id", profile.id)
    .eq("is_read", false);

  if (error) throw new Error("Unable to mark all notifications as read.");

  revalidatePath("/tenant/notifications");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant", "layout");
}