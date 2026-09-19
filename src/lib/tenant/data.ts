import { createClient } from "@/utils/supabase/server";
import { isMissingDatabaseColumn } from "@/lib/supabase/errors";
import { getCurrentDueStatus } from "@/lib/rent/status";

export type TenantAssignmentSummary = {
  tenantProfileId: string;
  assignmentId: string | null;
  assignmentType: "bed_space" | "room_space" | "apartment" | null;
  startDate: string | null;
  rentDueDate: string | null;
  endDate: string | null;
  unitId: string | null;
  unitName: string | null;
  roomId: string | null;
  roomNumber: string | null;
  bedSpaceId: string | null;
  bedLabel: string | null;
};

export type TenantRentalSnapshot = TenantAssignmentSummary & {
  obligationId: string | null;
  amountDue: number | null;
  amountPaid: number | null;
  dueDate: string | null;
  dueStatus: string | null;
  paymentStatus: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export type TenantRentalHistoryItem = {
  obligationId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  dueStatus: "upcoming" | "due_soon" | "due_today" | "overdue" | "paid";
  paymentStatus: "unpaid" | "pending_verification" | "partially_paid" | "paid" | "rejected";
};

export type TenantMaintenanceItem = {
  id: string;
  category: string;
  description: string;
  image_path: string | null;
  status: "pending" | "acknowledged" | "in_progress" | "resolved";
  landlord_notes: string | null;
  created_at: string;
  updated_at: string;
  attachment_urls: string[];
};

export type TenantNotificationItem = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
};

export async function getTenantAssignmentSummary(profileId: string): Promise<TenantAssignmentSummary | null> {
  const supabase = await createClient();

  const { data: tenantProfile, error: tenantProfileError } = await supabase
    .from("tenant_profiles")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (tenantProfileError) {
    throw new Error("Unable to load tenant profile.");
  }

  if (!tenantProfile) {
    return null;
  }

  const assignmentResult = await supabase
    .from("tenant_assignments")
    .select("id, assignment_type, start_date, rent_due_date, end_date, unit_id, room_id, bed_space_id")
    .eq("tenant_profile_id", tenantProfile.id)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let assignment = assignmentResult.data;
  let assignmentError = assignmentResult.error;

  if (isMissingDatabaseColumn(assignmentError, "tenant_assignments", "rent_due_date")) {
    const fallbackResult = await supabase
      .from("tenant_assignments")
      .select("id, assignment_type, start_date, end_date, unit_id, room_id, bed_space_id")
      .eq("tenant_profile_id", tenantProfile.id)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    assignment = fallbackResult.data ? { ...fallbackResult.data, rent_due_date: null } : null;
    assignmentError = fallbackResult.error;
  }

  if (assignmentError) {
    throw new Error("Unable to load tenant assignment.");
  }

  if (!assignment) {
    return {
      tenantProfileId: tenantProfile.id,
      assignmentId: null,
      assignmentType: null,
      startDate: null,
      rentDueDate: null,
      endDate: null,
      unitId: null,
      unitName: null,
      roomId: null,
      roomNumber: null,
      bedSpaceId: null,
      bedLabel: null,
    };
  }

  const [{ data: unit, error: unitError }, { data: room, error: roomError }, { data: bedSpace, error: bedSpaceError }] = await Promise.all([
    assignment.unit_id
      ? supabase.from("units").select("id, unit_name").eq("id", assignment.unit_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    assignment.room_id
      ? supabase.from("rooms").select("id, room_number").eq("id", assignment.room_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    assignment.bed_space_id
      ? supabase.from("bed_spaces").select("id, bed_label").eq("id", assignment.bed_space_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (unitError || roomError || bedSpaceError) {
    throw new Error("Unable to load assignment location details.");
  }

  return {
    tenantProfileId: tenantProfile.id,
    assignmentId: assignment.id,
    assignmentType: assignment.assignment_type,
    startDate: assignment.start_date,
    rentDueDate: assignment.rent_due_date,
    endDate: assignment.end_date,
    unitId: assignment.unit_id,
    unitName: unit?.unit_name ?? null,
    roomId: assignment.room_id,
    roomNumber: room?.room_number ?? null,
    bedSpaceId: assignment.bed_space_id,
    bedLabel: bedSpace?.bed_label ?? null,
  };
}

export async function getTenantRentalSnapshot(profileId: string): Promise<TenantRentalSnapshot | null> {
  const assignment = await getTenantAssignmentSummary(profileId);

  if (!assignment || !assignment.assignmentId) {
    return assignment
      ? {
          ...assignment,
          obligationId: null,
          amountDue: null,
          amountPaid: null,
          dueDate: assignment.rentDueDate,
          dueStatus: null,
          paymentStatus: null,
          periodStart: null,
          periodEnd: null,
        }
      : null;
  }

  const supabase = await createClient();
  const { data: obligation, error } = await supabase
    .from("rental_obligations")
    .select("id, amount_due, amount_paid, due_date, due_status, payment_status, period_start, period_end")
    .eq("tenant_assignment_id", assignment.assignmentId)
    .order("due_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load rental obligation.");
  }

  return {
    ...assignment,
    obligationId: obligation?.id ?? null,
    amountDue: obligation?.amount_due ?? null,
    amountPaid: obligation?.amount_paid ?? null,
    dueDate: obligation?.due_date ?? assignment.rentDueDate,
    dueStatus: obligation ? getCurrentDueStatus(obligation.due_date, obligation.payment_status) : null,
    paymentStatus: obligation?.payment_status ?? null,
    periodStart: obligation?.period_start ?? null,
    periodEnd: obligation?.period_end ?? null,
  };
}

export async function getTenantRentalHistory(profileId: string): Promise<TenantRentalHistoryItem[]> {
  const assignment = await getTenantAssignmentSummary(profileId);
  if (!assignment?.assignmentId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rental_obligations")
    .select("id, period_start, period_end, due_date, amount_due, amount_paid, payment_status")
    .eq("tenant_assignment_id", assignment.assignmentId)
    .order("due_date", { ascending: false });

  if (error) throw new Error("Unable to load rental payment history.");

  return (data ?? []).map((item) => ({
    obligationId: item.id,
    periodStart: item.period_start,
    periodEnd: item.period_end,
    dueDate: item.due_date,
    amountDue: Number(item.amount_due),
    amountPaid: Number(item.amount_paid),
    balance: Math.max(Number(item.amount_due) - Number(item.amount_paid), 0),
    dueStatus: getCurrentDueStatus(item.due_date, item.payment_status),
    paymentStatus: item.payment_status,
  }));
}

export async function getTenantMaintenanceRequests(profileId: string): Promise<TenantMaintenanceItem[]> {
  const assignment = await getTenantAssignmentSummary(profileId);

  if (!assignment) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("id, category, description, image_path, status, landlord_notes, created_at, updated_at")
    .eq("tenant_profile_id", assignment.tenantProfileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load maintenance requests.");
  }

  const requests = data ?? [];
  if (requests.length === 0) return [];
  const attachmentResult = await supabase
    .from("maintenance_attachments")
    .select("maintenance_request_id, storage_path")
    .in("maintenance_request_id", requests.map((request) => request.id));
  const attachmentUrlMap = new Map<string, string[]>();
  if (!attachmentResult.error) {
    await Promise.all((attachmentResult.data ?? []).map(async (attachment) => {
      const { data: signed } = await supabase.storage.from("maintenance-photos").createSignedUrl(attachment.storage_path, 600);
      if (!signed?.signedUrl) return;
      const current = attachmentUrlMap.get(attachment.maintenance_request_id) ?? [];
      current.push(signed.signedUrl);
      attachmentUrlMap.set(attachment.maintenance_request_id, current);
    }));
  }

  return requests.map((request) => ({ ...request, attachment_urls: attachmentUrlMap.get(request.id) ?? [] })) as TenantMaintenanceItem[];
}

export async function getTenantNotifications(profileId: string): Promise<TenantNotificationItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, notification_type, title, message, reference_type, reference_id, is_read, created_at")
    .eq("recipient_profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load notifications.");
  }

  return (data ?? []) as TenantNotificationItem[];
}