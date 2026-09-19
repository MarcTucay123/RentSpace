"use server";

import { revalidatePath } from "next/cache";

import { requireLandlordAccess } from "@/lib/auth/utils";
import { getCurrentDueStatus } from "@/lib/rent/status";
import { isMissingDatabaseColumn } from "@/lib/supabase/errors";
import { createClient } from "@/utils/supabase/server";

export type AssignmentFormState = {
  success?: boolean;
  message?: string;
};

const assignmentTypes = ["apartment", "room_space", "bed_space"] as const;

function parseAssignmentInput(formData: FormData) {
  const selection = String(formData.get("rentalSpace") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const rentDueDate = String(formData.get("rentDueDate") ?? "").trim();
  const monthlyRentValue = String(formData.get("monthlyRent") ?? "").trim();
  const monthlyRent = Number(monthlyRentValue);
  const [assignmentType, unitId, roomIdValue, bedSpaceIdValue] = selection.split(":");

  return {
    assignmentType,
    unitId,
    roomId: roomIdValue || null,
    bedSpaceId: bedSpaceIdValue || null,
    startDate,
    rentDueDate,
    monthlyRent,
    valid:
      /^\d{4}-\d{2}-\d{2}$/.test(startDate)
      && /^\d{4}-\d{2}-\d{2}$/.test(rentDueDate)
      && assignmentTypes.includes(assignmentType as (typeof assignmentTypes)[number])
      && Boolean(unitId)
      && monthlyRentValue !== ""
      && Number.isFinite(monthlyRent)
      && monthlyRent > 0,
  };
}

function getFirstPeriodEnd(startDate: string) {
  const [year, month, day] = startDate.split("-").map(Number);
  const daysInNextMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const nextMonthSameDay = new Date(Date.UTC(year, month, Math.min(day, daysInNextMonth)));
  nextMonthSameDay.setUTCDate(nextMonthSameDay.getUTCDate() - 1);
  return nextMonthSameDay.toISOString().slice(0, 10);
}

function getDueStatus(dueDate: string) {
  return getCurrentDueStatus(dueDate);
}

export async function assignTenantToRentalSpace(
  _previousState: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  await requireLandlordAccess();
  const supabase = await createClient();
  const tenantProfileId = String(formData.get("tenantProfileId") ?? "").trim();
  const { assignmentType, unitId, roomId, bedSpaceId, startDate, rentDueDate, monthlyRent, valid } = parseAssignmentInput(formData);

  if (!tenantProfileId || !valid) {
    return { success: false, message: "Select a rental space and enter valid move-in, due date, and monthly rent details." };
  }
  if (rentDueDate < startDate) {
    return { success: false, message: "The first rent due date cannot be before the move-in date." };
  }

  const [{ data: tenantProfile, error: tenantError }, { data: unit, error: unitError }, { data: activeTenantAssignment }] = await Promise.all([
    supabase.from("tenant_profiles").select("id, profile_id").eq("id", tenantProfileId).maybeSingle(),
    supabase.from("units").select("id, unit_name, unit_category, status").eq("id", unitId).maybeSingle(),
    supabase.from("tenant_assignments").select("id").eq("tenant_profile_id", tenantProfileId).eq("status", "active").maybeSingle(),
  ]);

  if (tenantError || !tenantProfile) return { success: false, message: "The Tenant record could not be found." };
  if (unitError || !unit || unit.status !== "active" || unit.unit_category !== assignmentType) {
    return { success: false, message: "The selected Unit is not available for this assignment type." };
  }
  if (activeTenantAssignment) return { success: false, message: "This Tenant already has an active rental assignment." };

  const { data: profile } = await supabase
    .from("users")
    .select("id, account_status, role")
    .eq("id", tenantProfile.profile_id)
    .maybeSingle();

  if (!profile || profile.role !== "tenant" || profile.account_status !== "approved") {
    return { success: false, message: "Only approved Tenant accounts can be assigned." };
  }

  if (assignmentType === "apartment" && (roomId || bedSpaceId)) {
    return { success: false, message: "Apartment Units must be assigned as a whole Unit." };
  }

  if (assignmentType !== "apartment") {
    const { data: room } = await supabase.from("rooms").select("id, unit_id, status").eq("id", roomId ?? "").maybeSingle();
    if (!room || room.unit_id !== unitId || room.status !== "active") {
      return { success: false, message: "The selected Room is not available." };
    }
  }

  if (assignmentType === "bed_space") {
    const { data: bedSpace } = await supabase.from("bed_spaces").select("id, room_id, status").eq("id", bedSpaceId ?? "").maybeSingle();
    if (!bedSpace || bedSpace.room_id !== roomId || bedSpace.status === "inactive") {
      return { success: false, message: "The selected Bed Space is not available." };
    }
  }

  let conflictQuery = supabase.from("tenant_assignments").select("id").eq("status", "active");
  if (assignmentType === "apartment") conflictQuery = conflictQuery.eq("unit_id", unitId).eq("assignment_type", "apartment");
  if (assignmentType === "room_space") conflictQuery = conflictQuery.eq("room_id", roomId).eq("assignment_type", "room_space");
  if (assignmentType === "bed_space") conflictQuery = conflictQuery.eq("bed_space_id", bedSpaceId).eq("assignment_type", "bed_space");
  const { data: conflict } = await conflictQuery.maybeSingle();
  if (conflict) return { success: false, message: "That rental space is already occupied." };

  const { data: assignment, error: assignmentError } = await supabase
    .from("tenant_assignments")
    .insert({
      tenant_profile_id: tenantProfileId,
      assignment_type: assignmentType,
      unit_id: unitId,
      room_id: roomId,
      bed_space_id: bedSpaceId,
      start_date: startDate,
      rent_due_date: rentDueDate,
      status: "active",
    })
    .select("id")
    .single();

  if (assignmentError || !assignment) {
    const missingRentDueDate = isMissingDatabaseColumn(assignmentError, "tenant_assignments", "rent_due_date");
    const legacySchemaMismatch = assignmentError?.code === "42703" && assignmentError.message.includes("property_id");
    return {
      success: false,
      message: missingRentDueDate
        ? "Rent due dates are not installed yet. Run migration 20260915_001 in Supabase, then try again."
        : legacySchemaMismatch
          ? "Assignment setup is outdated. Run migration 20260907_004 in Supabase, then try again."
        : assignmentError?.message ?? "Unable to create the rental assignment.",
    };
  }

  const { error: obligationError } = await supabase.from("rental_obligations").insert({
    tenant_assignment_id: assignment.id,
    period_start: startDate,
    period_end: getFirstPeriodEnd(startDate),
    due_date: rentDueDate,
    amount_due: monthlyRent,
    amount_paid: 0,
    due_status: getDueStatus(rentDueDate),
    payment_status: "unpaid",
  });

  if (obligationError) {
    await supabase.from("tenant_assignments").delete().eq("id", assignment.id);
    return { success: false, message: obligationError.code === "42501" ? "Monthly rent setup is not permitted yet. Run migration 20260915_002 in Supabase, then try again." : obligationError.message };
  }

  await supabase.from("notifications").insert({
    recipient_profile_id: tenantProfile.profile_id,
    notification_type: "rental_assignment",
    title: "Rental space assigned",
    message: `You have been assigned to ${unit.unit_name} at ${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(monthlyRent)} monthly. Your first rent due date is ${new Date(`${rentDueDate}T00:00:00`).toLocaleDateString("en-PH")}.`,
    reference_type: "tenant_assignment",
    reference_id: assignment.id,
  });

  revalidatePath("/landlord/tenants");
  revalidatePath("/landlord/dashboard");
  revalidatePath("/landlord/units");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/my-rental");
  revalidatePath("/tenant/notifications");
  return { success: true, message: "Tenant assigned successfully." };
}

export async function updateTenantAssignment(
  _previousState: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  await requireLandlordAccess();
  const supabase = await createClient();
  const assignmentId = String(formData.get("assignmentId") ?? "").trim();
  const { assignmentType, unitId, roomId, bedSpaceId, startDate, rentDueDate, monthlyRent, valid } = parseAssignmentInput(formData);

  if (!assignmentId || !valid) return { success: false, message: "Enter valid rental space, date, and monthly rent details." };
  if (rentDueDate < startDate) return { success: false, message: "The first rent due date cannot be before the move-in date." };

  const { data: assignment, error: loadError } = await supabase
    .from("tenant_assignments")
    .select("id, tenant_profile_id, assignment_type, unit_id, room_id, bed_space_id, start_date, rent_due_date")
    .eq("id", assignmentId)
    .eq("status", "active")
    .maybeSingle();
  if (loadError || !assignment) return { success: false, message: "This assignment is no longer active." };

  const { data: unit } = await supabase.from("units").select("id, unit_name, unit_category, status").eq("id", unitId).maybeSingle();
  if (!unit || unit.status !== "active" || unit.unit_category !== assignmentType) return { success: false, message: "The selected Unit is not available for this assignment type." };
  if (assignmentType === "apartment" && (roomId || bedSpaceId)) return { success: false, message: "Apartment Units must be assigned as a whole Unit." };

  if (assignmentType !== "apartment") {
    const { data: room } = await supabase.from("rooms").select("id, unit_id, status").eq("id", roomId ?? "").maybeSingle();
    if (!room || room.unit_id !== unitId || room.status !== "active") return { success: false, message: "The selected Room is not available." };
  }
  if (assignmentType === "bed_space") {
    const { data: bedSpace } = await supabase.from("bed_spaces").select("id, room_id, status").eq("id", bedSpaceId ?? "").maybeSingle();
    if (!bedSpace || bedSpace.room_id !== roomId || bedSpace.status === "inactive") return { success: false, message: "The selected Bed Space is not available." };
  }

  let conflictQuery = supabase.from("tenant_assignments").select("id").eq("status", "active").neq("id", assignmentId);
  if (assignmentType === "apartment") conflictQuery = conflictQuery.eq("unit_id", unitId).eq("assignment_type", "apartment");
  if (assignmentType === "room_space") conflictQuery = conflictQuery.eq("room_id", roomId).eq("assignment_type", "room_space");
  if (assignmentType === "bed_space") conflictQuery = conflictQuery.eq("bed_space_id", bedSpaceId).eq("assignment_type", "bed_space");
  const { data: conflict } = await conflictQuery.maybeSingle();
  if (conflict) return { success: false, message: "That rental space is already occupied." };

  const { data: obligation, error: obligationLoadError } = await supabase
    .from("rental_obligations")
    .select("id, amount_due, amount_paid, due_date, payment_status")
    .eq("tenant_assignment_id", assignmentId)
    .order("due_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (obligationLoadError) return { success: false, message: "Unable to load the Tenant's current monthly rent." };

  const billingChanged = !obligation || Number(obligation.amount_due) !== monthlyRent || obligation.due_date !== rentDueDate || assignment.start_date !== startDate;
  const hasPaymentActivity = obligation && (Number(obligation.amount_paid) > 0 || !["unpaid", "rejected"].includes(obligation.payment_status));
  if (billingChanged && hasPaymentActivity) return { success: false, message: "Rent or billing dates cannot be changed after payment activity. Create the next billing period instead." };

  const { error: updateError } = await supabase.from("tenant_assignments").update({
    assignment_type: assignmentType,
    unit_id: unitId,
    room_id: roomId,
    bed_space_id: bedSpaceId,
    start_date: startDate,
    rent_due_date: rentDueDate,
  }).eq("id", assignmentId).eq("status", "active");
  if (updateError) return { success: false, message: updateError.message };

  const obligationValues = {
    period_start: startDate,
    period_end: getFirstPeriodEnd(startDate),
    due_date: rentDueDate,
    amount_due: monthlyRent,
    due_status: getDueStatus(rentDueDate),
  };
  const billingResult = obligation
    ? await supabase.from("rental_obligations").update(obligationValues).eq("id", obligation.id)
    : await supabase.from("rental_obligations").insert({ ...obligationValues, tenant_assignment_id: assignmentId, amount_paid: 0, payment_status: "unpaid" });
  if (billingResult.error) {
    await supabase.from("tenant_assignments").update({
      assignment_type: assignment.assignment_type,
      unit_id: assignment.unit_id,
      room_id: assignment.room_id,
      bed_space_id: assignment.bed_space_id,
      start_date: assignment.start_date,
      rent_due_date: assignment.rent_due_date,
    }).eq("id", assignmentId);
    return { success: false, message: billingResult.error.code === "42501" ? "Monthly rent editing is not permitted yet. Run migration 20260915_002 in Supabase, then try again." : billingResult.error.message };
  }

  const { data: tenantProfile } = await supabase.from("tenant_profiles").select("profile_id").eq("id", assignment.tenant_profile_id).maybeSingle();
  if (tenantProfile) await supabase.from("notifications").insert({
    recipient_profile_id: tenantProfile.profile_id,
    notification_type: "rental_assignment_updated",
    title: "Rental assignment updated",
    message: `Your assignment is now ${unit.unit_name} at ${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(monthlyRent)} monthly, due ${new Date(`${rentDueDate}T00:00:00`).toLocaleDateString("en-PH")}.`,
    reference_type: "tenant_assignment",
    reference_id: assignmentId,
  });

  revalidatePath("/landlord/tenants");
  revalidatePath("/landlord/dashboard");
  revalidatePath("/landlord/units");
  revalidatePath("/landlord/rent-monitoring");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/my-rental");
  revalidatePath("/tenant/notifications");
  return { success: true, message: "Assignment and monthly rent updated successfully." };
}

export async function completeTenantAssignment(assignmentId: string): Promise<AssignmentFormState> {
  await requireLandlordAccess();
  const supabase = await createClient();
  const normalizedId = assignmentId.trim();

  if (!normalizedId) return { success: false, message: "The active assignment could not be identified." };

  const { data: assignment, error: loadError } = await supabase
    .from("tenant_assignments")
    .select("id, tenant_profile_id, unit_id, start_date, status")
    .eq("id", normalizedId)
    .eq("status", "active")
    .maybeSingle();

  if (loadError || !assignment) {
    return { success: false, message: "This assignment is no longer active." };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (today < assignment.start_date) {
    return { success: false, message: "A move-out date cannot be before the move-in date." };
  }

  const { error: updateError } = await supabase
    .from("tenant_assignments")
    .update({ status: "completed", end_date: today })
    .eq("id", assignment.id)
    .eq("status", "active");

  if (updateError) return { success: false, message: updateError.message ?? "Unable to complete this assignment." };

  const { data: tenantProfile } = await supabase
    .from("tenant_profiles")
    .select("profile_id")
    .eq("id", assignment.tenant_profile_id)
    .maybeSingle();

  if (tenantProfile) {
    await supabase.from("notifications").insert({
      recipient_profile_id: tenantProfile.profile_id,
      notification_type: "rental_move_out",
      title: "Rental assignment completed",
      message: `Your rental assignment ended on ${new Date(`${today}T00:00:00`).toLocaleDateString("en-PH")}. Contact the Landlord if this needs correction.`,
      reference_type: "tenant_assignment",
      reference_id: assignment.id,
    });
  }

  revalidatePath("/landlord/tenants");
  revalidatePath("/landlord/dashboard");
  revalidatePath("/landlord/units");
  revalidatePath(`/landlord/units/${assignment.unit_id}`);
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/my-rental");
  revalidatePath("/tenant/notifications");
  return { success: true, message: "Move-out completed. The rental space is available again." };
}

export async function markLandlordNotificationAsRead(notificationId: string) {
  const { profile } = await requireLandlordAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_profile_id", profile.id);

  if (error) throw new Error("Unable to mark this notification as read.");

  revalidatePath("/landlord/notifications");
  revalidatePath("/landlord/dashboard");
  revalidatePath("/landlord", "layout");
}

export async function markAllLandlordNotificationsAsRead() {
  const { profile } = await requireLandlordAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_profile_id", profile.id)
    .eq("is_read", false);

  if (error) throw new Error("Unable to mark all notifications as read.");

  revalidatePath("/landlord/notifications");
  revalidatePath("/landlord/dashboard");
  revalidatePath("/landlord", "layout");
}

export async function updateMaintenanceRequest(
  _previousState: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  await requireLandlordAccess();
  const supabase = await createClient();
  const requestId = String(formData.get("requestId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const landlordNotes = String(formData.get("landlordNotes") ?? "").trim();

  if (!requestId || !["pending", "acknowledged", "in_progress", "resolved"].includes(status)) {
    return { success: false, message: "Select a valid maintenance status." };
  }
  if (landlordNotes.length > 1000) return { success: false, message: "Landlord notes must be 1,000 characters or fewer." };

  const { data: updated, error } = await supabase
    .from("maintenance_requests")
    .update({
      status,
      landlord_notes: landlordNotes || null,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", requestId)
    .select("id")
    .maybeSingle();

  if (error || !updated) return { success: false, message: error?.message || "Unable to update this maintenance request." };

  revalidatePath("/landlord/maintenance");
  revalidatePath("/landlord/dashboard");
  revalidatePath("/landlord/reports");
  revalidatePath("/tenant/maintenance");
  return { success: true, message: status === "resolved" ? "Maintenance request marked as resolved." : "Maintenance request updated." };
}

export async function recordCashPayment(
  _previousState: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  await requireLandlordAccess();
  const supabase = await createClient();
  const obligationId = String(formData.get("rentalObligationId") ?? "").trim();
  const selectedStatus = String(formData.get("paymentStatus") ?? "").trim();
  const cashPaymentId = String(formData.get("cashPaymentId") ?? "").trim() || null;

  if (!obligationId || !["unpaid", "paid"].includes(selectedStatus)) return { success: false, message: "Select a valid payment status." };

  if (selectedStatus === "unpaid" && !cashPaymentId) {
    return { success: true, message: "This obligation is already unpaid." };
  }

  const { error } = await supabase.rpc("set_manual_cash_payment_status", {
    p_rental_obligation_id: obligationId,
    p_payment_status: selectedStatus,
    p_cash_payment_id: cashPaymentId,
  });
  if (error) return { success: false, message: error.code === "PGRST202" ? "Cash status management is not available yet. Run migration 20260916_001 in Supabase, then try again." : error.message };

  revalidatePath("/landlord/rent-monitoring");
  revalidatePath("/landlord/payments");
  revalidatePath("/landlord/dashboard");
  revalidatePath("/landlord", "layout");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/my-rental");
  return {
    success: true,
    message: selectedStatus === "paid" ? "Cash payment marked as paid." : "Cash payment reversed and marked as unpaid.",
  };
}

export async function verifyTenantPayment(paymentId: string): Promise<AssignmentFormState> {
  const { profile } = await requireLandlordAccess();
  const supabase = await createClient();
  const normalizedId = paymentId.trim();
  if (!normalizedId) return { success: false, message: "The payment could not be identified." };

  const { data: payment, error: loadError } = await supabase
    .from("payments")
    .select("id, verification_status")
    .eq("id", normalizedId)
    .maybeSingle();
  if (loadError || !payment) return { success: false, message: "The payment could not be found." };
  if (payment.verification_status !== "pending") return { success: false, message: "This payment has already been reviewed." };

  const { error } = await supabase.from("payments").update({
    verification_status: "verified",
    verified_by: profile.id,
    verified_at: new Date().toISOString(),
    rejection_reason: null,
  }).eq("id", normalizedId).eq("verification_status", "pending");
  if (error) return { success: false, message: error.code === "42501" ? "Payment verification is not permitted yet. Run migration 20260915_003 in Supabase." : error.message };

  revalidatePath("/landlord/payments");
  revalidatePath("/landlord/rent-monitoring");
  revalidatePath("/landlord/dashboard");
  revalidatePath("/landlord", "layout");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/my-rental");
  return { success: true, message: "Payment verified successfully." };
}

export async function rejectTenantPayment(
  _previousState: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  const { profile } = await requireLandlordAccess();
  const supabase = await createClient();
  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();
  if (!paymentId || rejectionReason.length < 3) return { success: false, message: "Enter a clear rejection reason." };
  if (rejectionReason.length > 500) return { success: false, message: "The rejection reason must be 500 characters or fewer." };

  const { data: payment, error: loadError } = await supabase
    .from("payments")
    .select("id, tenant_profile_id, verification_status")
    .eq("id", paymentId)
    .maybeSingle();
  if (loadError || !payment) return { success: false, message: "The payment could not be found." };
  if (payment.verification_status !== "pending") return { success: false, message: "This payment has already been reviewed." };

  const { error } = await supabase.from("payments").update({
    verification_status: "rejected",
    verified_by: profile.id,
    verified_at: new Date().toISOString(),
    rejection_reason: rejectionReason,
  }).eq("id", payment.id).eq("verification_status", "pending");
  if (error) return { success: false, message: error.code === "42501" ? "Payment rejection is not permitted yet. Run migration 20260915_003 in Supabase." : error.message };

  const { data: tenantProfile } = await supabase.from("tenant_profiles").select("profile_id").eq("id", payment.tenant_profile_id).maybeSingle();
  if (tenantProfile) await supabase.from("notifications").insert({
    recipient_profile_id: tenantProfile.profile_id,
    notification_type: "payment_rejected",
    title: "Payment proof rejected",
    message: `Your payment proof was rejected: ${rejectionReason}. Please submit a new proof from My Rental.`,
    reference_type: "payment",
    reference_id: payment.id,
  });

  revalidatePath("/landlord/payments");
  revalidatePath("/landlord/rent-monitoring");
  revalidatePath("/landlord", "layout");
  revalidatePath("/tenant/dashboard");
  revalidatePath("/tenant/my-rental");
  revalidatePath("/tenant/notifications");
  revalidatePath("/tenant", "layout");
  return { success: true, message: "Payment rejected. The Tenant can submit a new proof." };
}

export async function notifyTenantOfOverdueRent(obligationId: string): Promise<AssignmentFormState> {
  const { profile } = await requireLandlordAccess();
  const supabase = await createClient();
  const normalizedId = obligationId.trim();
  if (!normalizedId) return { success: false, message: "The overdue obligation could not be identified." };

  const { data: obligation, error: obligationError } = await supabase
    .from("rental_obligations")
    .select("id, tenant_assignment_id, amount_due, amount_paid, due_date, payment_status")
    .eq("id", normalizedId)
    .maybeSingle();
  if (obligationError || !obligation) return { success: false, message: "The overdue obligation could not be found." };
  const balance = Math.max(Number(obligation.amount_due) - Number(obligation.amount_paid), 0);
  if (obligation.due_date >= new Date().toISOString().slice(0, 10) || obligation.payment_status === "paid" || balance <= 0) {
    return { success: false, message: "This obligation is no longer overdue and unpaid." };
  }

  const { data: assignment } = await supabase.from("tenant_assignments").select("tenant_profile_id").eq("id", obligation.tenant_assignment_id).maybeSingle();
  if (!assignment) return { success: false, message: "The Tenant assignment could not be found." };
  const { data: tenantProfile } = await supabase.from("tenant_profiles").select("profile_id").eq("id", assignment.tenant_profile_id).maybeSingle();
  if (!tenantProfile) return { success: false, message: "The Tenant account could not be found." };

  const dueDate = new Date(`${obligation.due_date}T00:00:00`).toLocaleDateString("en-PH");
  const balanceLabel = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(balance);
  const body = `Rent reminder: Your rent due on ${dueDate} is overdue. Your outstanding balance is ${balanceLabel}. Please settle the balance or contact the Landlord if you need assistance.`;
  const { error: messageError } = await supabase.from("messages").insert({ sender_profile_id: profile.id, recipient_profile_id: tenantProfile.profile_id, body });
  if (messageError) return { success: false, message: messageError.code === "42P01" ? "Messaging is not installed yet. Run migration 20260907_005 in Supabase." : "Unable to notify the Tenant right now." };

  revalidatePath("/landlord/messages");
  revalidatePath("/tenant/messages");
  revalidatePath("/tenant/notifications");
  revalidatePath("/tenant", "layout");
  return { success: true, message: "Overdue reminder sent to the Tenant's Messages and Notifications." };
}