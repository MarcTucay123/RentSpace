import { createClient } from "@/utils/supabase/server";
import { isMissingDatabaseColumn } from "@/lib/supabase/errors";
import { getCurrentDueStatus } from "@/lib/rent/status";

export type LandlordTenantItem = {
  tenantProfileId: string;
  profileId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  mobileNumber: string;
  email: string | null;
  profilePhotoUrl: string | null;
  accountStatus: "pending" | "approved" | "rejected" | "inactive";
  propertyId: string | null;
  propertyName: string | null;
  unitName: string | null;
  roomNumber: string | null;
  bedLabel: string | null;
  assignmentType: "bed_space" | "room_space" | "apartment" | null;
  assignmentId: string | null;
  unitId: string | null;
  roomId: string | null;
  bedSpaceId: string | null;
  moveInDate: string | null;
  rentDueDate: string | null;
  monthlyRent: number | null;
};

export type LandlordPaymentItem = {
  paymentId: string;
  rentalObligationId: string;
  tenantProfileId: string;
  tenantName: string;
  tenantProfilePhotoUrl: string | null;
  unitName: string | null;
  roomNumber: string | null;
  bedLabel: string | null;
  amount: number;
  paymentDate: string;
  paymentMethod: "cash" | "gcash";
  verificationStatus: "pending" | "verified" | "rejected";
  rejectionReason: string | null;
  dueStatus: "upcoming" | "due_soon" | "due_today" | "overdue" | "paid";
  paymentStatus: "unpaid" | "pending_verification" | "partially_paid" | "paid" | "rejected";
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  proofImagePath: string | null;
  proofImageUrl: string | null;
};

export type LandlordMaintenanceItem = {
  id: string;
  tenantName: string;
  tenantProfilePhotoUrl: string | null;
  unitName: string | null;
  roomNumber: string | null;
  bedLabel: string | null;
  category: string;
  description: string;
  status: "pending" | "acknowledged" | "in_progress" | "resolved";
  landlordNotes: string | null;
  attachmentUrls: string[];
  createdAt: string;
  updatedAt: string;
};

export type LandlordRentMonitoringItem = {
  rentalObligationId: string;
  tenantProfileId: string;
  tenantName: string;
  tenantProfilePhotoUrl: string | null;
  unitName: string | null;
  roomNumber: string | null;
  bedLabel: string | null;
  assignmentType: "bed_space" | "room_space" | "apartment" | null;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  dueStatus: "upcoming" | "due_soon" | "due_today" | "overdue" | "paid";
  paymentStatus: "unpaid" | "pending_verification" | "partially_paid" | "paid" | "rejected";
};

export type LandlordNotificationItem = {
  id: string;
  notificationType: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
};

export type LandlordReportsSnapshot = {
  tenantsCount: number;
  assignedTenantsCount: number;
  paymentsCount: number;
  verifiedPaymentsCount: number;
  pendingPaymentsCount: number;
  maintenanceCount: number;
  pendingMaintenanceCount: number;
  obligationsCount: number;
  paidObligationsCount: number;
  overdueObligationsCount: number;
  totalAmountDue: number;
  totalAmountPaid: number;
  outstandingBalance: number;
};

type TenantProfileRow = {
  id: string;
  profile_id: string;
};

type ProfileRow = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  mobile_number: string;
  email: string | null;
  profile_photo_url: string | null;
  account_status: "pending" | "approved" | "rejected" | "inactive";
};

type AssignmentRow = {
  id: string;
  tenant_profile_id: string;
  assignment_type: "bed_space" | "room_space" | "apartment";
  unit_id: string;
  room_id: string | null;
  bed_space_id: string | null;
  start_date: string;
  rent_due_date: string | null;
  status?: string;
};

type UnitRow = {
  id: string;
  unit_name: string;
  property_id?: string;
};

type RoomRow = {
  id: string;
  room_number: string;
};

type BedSpaceRow = {
  id: string;
  bed_label: string;
};

type RentalObligationRow = {
  id: string;
  tenant_assignment_id: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  due_status: "upcoming" | "due_soon" | "due_today" | "overdue";
  payment_status: "unpaid" | "pending_verification" | "partially_paid" | "paid" | "rejected";
};

type PaymentRow = {
  id: string;
  rental_obligation_id: string;
  tenant_profile_id: string;
  payment_method: "cash" | "gcash";
  amount: number;
  payment_date: string;
  verification_status: "pending" | "verified" | "rejected";
  rejection_reason: string | null;
};

type PaymentProofRow = {
  payment_id: string;
  storage_path: string | null;
};

type MaintenanceRow = {
  id: string;
  tenant_profile_id: string;
  unit_id: string;
  room_id: string | null;
  bed_space_id: string | null;
  category: string;
  description: string;
  status: "pending" | "acknowledged" | "in_progress" | "resolved";
  landlord_notes: string | null;
  created_at: string;
  updated_at: string;
};

type MaintenanceAttachmentRow = {
  maintenance_request_id: string;
  storage_path: string;
};

type NotificationRow = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
};

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function latestAssignmentsByTenant(assignments: AssignmentRow[]) {
  const map = new Map<string, AssignmentRow>();

  for (const assignment of assignments) {
    const current = map.get(assignment.tenant_profile_id);
    if (!current || new Date(assignment.start_date).getTime() > new Date(current.start_date).getTime()) {
      map.set(assignment.tenant_profile_id, assignment);
    }
  }

  return map;
}

async function loadUnitContext(supabase: Awaited<ReturnType<typeof createClient>>, assignments: AssignmentRow[]) {
  const unitIds = unique(assignments.map((item) => item.unit_id).filter(Boolean));
  const roomIds = unique(assignments.map((item) => item.room_id).filter((value): value is string => Boolean(value)));
  const bedSpaceIds = unique(assignments.map((item) => item.bed_space_id).filter((value): value is string => Boolean(value)));

  const [unitsResult, roomsResult, bedSpacesResult] = await Promise.all([
    unitIds.length
      ? supabase.from("units").select("id, unit_name").in("id", unitIds)
      : Promise.resolve({ data: [], error: null }),
    roomIds.length
      ? supabase.from("rooms").select("id, room_number").in("id", roomIds)
      : Promise.resolve({ data: [], error: null }),
    bedSpaceIds.length
      ? supabase.from("bed_spaces").select("id, bed_label").in("id", bedSpaceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const contextErrors = [
    ["units", unitsResult.error],
    ["rooms", roomsResult.error],
    ["bed_spaces", bedSpacesResult.error],
  ].filter((entry): entry is [string, NonNullable<typeof unitsResult.error>] => entry[1] !== null);

  if (contextErrors.length > 0) {
    console.error("Unable to load part of the landlord unit context:", contextErrors.map(([table, error]) => ({
      table,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })));
  }

  return {
    units: (unitsResult.error ? [] : unitsResult.data ?? []) as UnitRow[],
    rooms: (roomsResult.error ? [] : roomsResult.data ?? []) as RoomRow[],
    bedSpaces: (bedSpacesResult.error ? [] : bedSpacesResult.data ?? []) as BedSpaceRow[],
  };
}

export async function getLandlordTenants(): Promise<LandlordTenantItem[]> {
  const supabase = await createClient();

  const [tenantProfilesResult, initialAssignmentsResult] = await Promise.all([
    supabase.from("tenant_profiles").select("id, profile_id"),
    supabase
      .from("tenant_assignments")
      .select("id, tenant_profile_id, assignment_type, unit_id, room_id, bed_space_id, start_date, rent_due_date, status")
      .eq("status", "active")
      .order("start_date", { ascending: false }),
  ]);

  let assignmentRows = initialAssignmentsResult.data;
  let assignmentsError = initialAssignmentsResult.error;
  if (isMissingDatabaseColumn(assignmentsError, "tenant_assignments", "rent_due_date")) {
    const fallbackResult = await supabase
      .from("tenant_assignments")
      .select("id, tenant_profile_id, assignment_type, unit_id, room_id, bed_space_id, start_date, status")
      .eq("status", "active")
      .order("start_date", { ascending: false });

    assignmentRows = fallbackResult.data?.map((assignment) => ({ ...assignment, rent_due_date: null })) ?? null;
    assignmentsError = fallbackResult.error;
  }

  if (tenantProfilesResult.error || assignmentsError) {
    throw new Error("Unable to load landlord tenants.");
  }

  const tenantProfiles = (tenantProfilesResult.data ?? []) as TenantProfileRow[];
  const assignments = (assignmentRows ?? []) as AssignmentRow[];
  if (!tenantProfiles.length) {
    return [];
  }

  const profileIds = unique(tenantProfiles.map((item) => item.profile_id));
  const relevantAssignments = assignments.filter((item) => tenantProfiles.some((tenant) => tenant.id === item.tenant_profile_id));
  const [profilesResult, unitContext, obligationsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, middle_name, last_name, mobile_number, email, account_status, profile_photo_url")
      .in("id", profileIds),
    loadUnitContext(supabase, relevantAssignments),
    relevantAssignments.length
      ? supabase
          .from("rental_obligations")
          .select("id, tenant_assignment_id, amount_due, amount_paid, due_date, due_status, payment_status")
          .in("tenant_assignment_id", relevantAssignments.map((assignment) => assignment.id))
          .order("due_date", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error || obligationsResult.error) {
    throw new Error("Unable to load landlord tenants.");
  }

  const profileMap = new Map(((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const unitMap = new Map(unitContext.units.map((unit) => [unit.id, unit.unit_name]));
  const roomMap = new Map(unitContext.rooms.map((room) => [room.id, room.room_number]));
  const bedMap = new Map(unitContext.bedSpaces.map((bed) => [bed.id, bed.bed_label]));
  const assignmentMap = latestAssignmentsByTenant(assignments);
  const obligationMap = new Map<string, RentalObligationRow>();
  for (const obligation of (obligationsResult.data ?? []) as RentalObligationRow[]) {
    if (!obligationMap.has(obligation.tenant_assignment_id)) obligationMap.set(obligation.tenant_assignment_id, obligation);
  }

  return tenantProfiles
    .map<LandlordTenantItem | null>((tenantProfile) => {
      const profile = profileMap.get(tenantProfile.profile_id);
      if (!profile) {
        return null;
      }

      const assignment = assignmentMap.get(tenantProfile.id) ?? null;
      const obligation = assignment ? obligationMap.get(assignment.id) ?? null : null;

      return {
        tenantProfileId: tenantProfile.id,
        profileId: tenantProfile.profile_id,
        firstName: profile.first_name,
        middleName: profile.middle_name,
        lastName: profile.last_name,
        mobileNumber: profile.mobile_number,
        email: profile.email,
        profilePhotoUrl: profile.profile_photo_url,
        accountStatus: profile.account_status,
        propertyId: null,
        propertyName: null,
        unitName: assignment ? unitMap.get(assignment.unit_id) ?? null : null,
        roomNumber: assignment?.room_id ? roomMap.get(assignment.room_id) ?? null : null,
        bedLabel: assignment?.bed_space_id ? bedMap.get(assignment.bed_space_id) ?? null : null,
        assignmentType: assignment?.assignment_type ?? null,
        assignmentId: assignment?.id ?? null,
        unitId: assignment?.unit_id ?? null,
        roomId: assignment?.room_id ?? null,
        bedSpaceId: assignment?.bed_space_id ?? null,
        moveInDate: assignment?.start_date ?? null,
        rentDueDate: assignment?.rent_due_date ?? null,
        monthlyRent: obligation?.amount_due ?? null,
      };
    })
    .filter((item): item is LandlordTenantItem => item !== null)
    .sort((a, b) => `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`));
}

export async function getLandlordPayments(): Promise<LandlordPaymentItem[]> {
  const supabase = await createClient();

  const [paymentsResult, obligationsResult] = await Promise.all([
    supabase
      .from("payments")
      .select("id, rental_obligation_id, tenant_profile_id, payment_method, amount, payment_date, verification_status, rejection_reason")
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("rental_obligations").select("id, tenant_assignment_id, amount_due, amount_paid, due_date, due_status, payment_status"),
  ]);

  if (paymentsResult.error || obligationsResult.error) {
    throw new Error("Unable to load landlord payments.");
  }

  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const obligations = (obligationsResult.data ?? []) as RentalObligationRow[];
  const obligationIds = unique(payments.map((item) => item.rental_obligation_id));
  const obligationMap = new Map(obligations.filter((item) => obligationIds.includes(item.id)).map((item) => [item.id, item]));
  const assignmentIds = unique(
    obligations.filter((item) => obligationIds.includes(item.id)).map((item) => item.tenant_assignment_id),
  );

  const [assignmentsResult, proofsResult] = await Promise.all([
    assignmentIds.length
      ? supabase
          .from("tenant_assignments")
          .select("id, tenant_profile_id, assignment_type, unit_id, room_id, bed_space_id, start_date")
          .in("id", assignmentIds)
      : Promise.resolve({ data: [], error: null }),
    payments.length
      ? supabase.from("payment_proofs").select("payment_id, storage_path").in("payment_id", unique(payments.map((item) => item.id)))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (assignmentsResult.error || proofsResult.error) {
    throw new Error("Unable to load landlord payments.");
  }

  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[];
  const tenantProfileIds = unique(payments.map((item) => item.tenant_profile_id));

  const [tenantProfilesResult, unitContext] = await Promise.all([
    tenantProfileIds.length
      ? supabase.from("tenant_profiles").select("id, profile_id").in("id", tenantProfileIds)
      : Promise.resolve({ data: [], error: null }),
    loadUnitContext(supabase, assignments),
  ]);

  if (tenantProfilesResult.error) {
    throw new Error("Unable to load landlord payments.");
  }

  const tenantProfiles = (tenantProfilesResult.data ?? []) as Pick<TenantProfileRow, "id" | "profile_id">[];
  const profileIds = unique(tenantProfiles.map((item) => item.profile_id));

  const profilesResult = profileIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name, profile_photo_url").in("id", profileIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    throw new Error("Unable to load landlord payments.");
  }

  const assignmentMap = new Map(assignments.map((item) => [item.id, item]));
  const tenantProfileToProfileMap = new Map(tenantProfiles.map((item) => [item.id, item.profile_id]));
  const profileNameMap = new Map(
    ((profilesResult.data ?? []) as Array<{ id: string; first_name: string; last_name: string; profile_photo_url: string | null }>).map((profile) => [
      profile.id,
      `${profile.first_name} ${profile.last_name}`.trim(),
    ]),
  );
  const profilePhotoMap = new Map(
    ((profilesResult.data ?? []) as Array<{ id: string; profile_photo_url: string | null }>).map((profile) => [profile.id, profile.profile_photo_url]),
  );
  const unitMap = new Map(unitContext.units.map((unit) => [unit.id, unit.unit_name]));
  const roomMap = new Map(unitContext.rooms.map((room) => [room.id, room.room_number]));
  const bedMap = new Map(unitContext.bedSpaces.map((bed) => [bed.id, bed.bed_label]));

  const proofMap = new Map<string, string | null>();
  for (const proof of (proofsResult.data ?? []) as PaymentProofRow[]) {
    if (!proofMap.has(proof.payment_id)) {
      proofMap.set(proof.payment_id, proof.storage_path);
    }
  }

  const proofUrlMap = new Map<string, string>();
  await Promise.all(Array.from(proofMap.entries()).map(async ([paymentId, path]) => {
    if (!path) return;
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 300);
    if (data?.signedUrl) proofUrlMap.set(paymentId, data.signedUrl);
  }));

  return payments.map((payment) => {
    const obligation = obligationMap.get(payment.rental_obligation_id);
    const assignment = obligation ? assignmentMap.get(obligation.tenant_assignment_id) : undefined;
    const profileId = tenantProfileToProfileMap.get(payment.tenant_profile_id);

    return {
      paymentId: payment.id,
      rentalObligationId: payment.rental_obligation_id,
      tenantProfileId: payment.tenant_profile_id,
      tenantName: profileId ? profileNameMap.get(profileId) ?? "Tenant" : "Tenant",
      tenantProfilePhotoUrl: profileId ? profilePhotoMap.get(profileId) ?? null : null,
      unitName: assignment ? unitMap.get(assignment.unit_id) ?? null : null,
      roomNumber: assignment?.room_id ? roomMap.get(assignment.room_id) ?? null : null,
      bedLabel: assignment?.bed_space_id ? bedMap.get(assignment.bed_space_id) ?? null : null,
      amount: payment.amount,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
      verificationStatus: payment.verification_status,
      rejectionReason: payment.rejection_reason,
      dueStatus: obligation ? getCurrentDueStatus(obligation.due_date, obligation.payment_status) : "upcoming",
      paymentStatus: obligation?.payment_status ?? "unpaid",
      amountDue: obligation?.amount_due ?? 0,
      amountPaid: obligation?.amount_paid ?? 0,
      dueDate: obligation?.due_date ?? payment.payment_date,
      proofImagePath: proofMap.get(payment.id) ?? null,
      proofImageUrl: proofUrlMap.get(payment.id) ?? null,
    } satisfies LandlordPaymentItem;
  });
}

export async function getLandlordMaintenanceRequests(): Promise<LandlordMaintenanceItem[]> {
  const supabase = await createClient();

  const maintenanceResult = await supabase
    .from("maintenance_requests")
    .select("id, tenant_profile_id, unit_id, room_id, bed_space_id, category, description, status, landlord_notes, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (maintenanceResult.error) {
    throw new Error("Unable to load landlord maintenance requests.");
  }

  const maintenanceRows = (maintenanceResult.data ?? []) as MaintenanceRow[];
  if (!maintenanceRows.length) {
    return [];
  }

  const tenantProfileIds = unique(maintenanceRows.map((item) => item.tenant_profile_id));
  const attachmentResult = await supabase
    .from("maintenance_attachments")
    .select("maintenance_request_id, storage_path")
    .in("maintenance_request_id", maintenanceRows.map((item) => item.id));
  const attachments = attachmentResult.error ? [] : (attachmentResult.data ?? []) as MaintenanceAttachmentRow[];
  const attachmentUrlMap = new Map<string, string[]>();
  await Promise.all(attachments.map(async (attachment) => {
    const { data } = await supabase.storage.from("maintenance-photos").createSignedUrl(attachment.storage_path, 600);
    if (!data?.signedUrl) return;
    const current = attachmentUrlMap.get(attachment.maintenance_request_id) ?? [];
    current.push(data.signedUrl);
    attachmentUrlMap.set(attachment.maintenance_request_id, current);
  }));
  const pseudoAssignments: AssignmentRow[] = maintenanceRows.map((item) => ({
    id: item.id,
    tenant_profile_id: item.tenant_profile_id,
    assignment_type: "apartment",
    unit_id: item.unit_id,
    room_id: item.room_id,
    bed_space_id: item.bed_space_id,
    start_date: item.created_at,
    rent_due_date: null,
  }));

  const [tenantProfilesResult, unitContext] = await Promise.all([
    supabase.from("tenant_profiles").select("id, profile_id").in("id", tenantProfileIds),
    loadUnitContext(supabase, pseudoAssignments),
  ]);

  if (tenantProfilesResult.error) {
    throw new Error("Unable to load landlord maintenance requests.");
  }

  const tenantProfiles = (tenantProfilesResult.data ?? []) as Pick<TenantProfileRow, "id" | "profile_id">[];
  const profileIds = unique(tenantProfiles.map((item) => item.profile_id));
  const profilesResult = profileIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name, profile_photo_url").in("id", profileIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    throw new Error("Unable to load landlord maintenance requests.");
  }

  const tenantProfileToProfileMap = new Map(tenantProfiles.map((item) => [item.id, item.profile_id]));
  const profileNameMap = new Map(
    ((profilesResult.data ?? []) as Array<{ id: string; first_name: string; last_name: string; profile_photo_url: string | null }>).map((profile) => [
      profile.id,
      `${profile.first_name} ${profile.last_name}`.trim(),
    ]),
  );
  const profilePhotoMap = new Map(
    ((profilesResult.data ?? []) as Array<{ id: string; profile_photo_url: string | null }>).map((profile) => [profile.id, profile.profile_photo_url]),
  );
  const unitMap = new Map(unitContext.units.map((unit) => [unit.id, unit.unit_name]));
  const roomMap = new Map(unitContext.rooms.map((room) => [room.id, room.room_number]));
  const bedMap = new Map(unitContext.bedSpaces.map((bed) => [bed.id, bed.bed_label]));

  return maintenanceRows.map((item) => {
    const profileId = tenantProfileToProfileMap.get(item.tenant_profile_id);

    return {
      id: item.id,
      tenantName: profileId ? profileNameMap.get(profileId) ?? "Tenant" : "Tenant",
      tenantProfilePhotoUrl: profileId ? profilePhotoMap.get(profileId) ?? null : null,
      unitName: unitMap.get(item.unit_id) ?? null,
      roomNumber: item.room_id ? roomMap.get(item.room_id) ?? null : null,
      bedLabel: item.bed_space_id ? bedMap.get(item.bed_space_id) ?? null : null,
      category: item.category,
      description: item.description,
      status: item.status,
      landlordNotes: item.landlord_notes,
      attachmentUrls: attachmentUrlMap.get(item.id) ?? [],
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    } satisfies LandlordMaintenanceItem;
  });
}

export async function getLandlordRentMonitoring(): Promise<LandlordRentMonitoringItem[]> {
  const supabase = await createClient();

  const obligationsResult = await supabase
    .from("rental_obligations")
    .select("id, tenant_assignment_id, amount_due, amount_paid, due_date, due_status, payment_status")
    .order("due_date", { ascending: false });

  if (obligationsResult.error) {
    throw new Error("Unable to load landlord rent monitoring.");
  }

  const obligations = (obligationsResult.data ?? []) as RentalObligationRow[];
  if (!obligations.length) {
    return [];
  }

  const assignmentIds = unique(obligations.map((item) => item.tenant_assignment_id));
  const assignmentsResult = await supabase
    .from("tenant_assignments")
    .select("id, tenant_profile_id, assignment_type, unit_id, room_id, bed_space_id, start_date")
    .in("id", assignmentIds);

  if (assignmentsResult.error) {
    throw new Error("Unable to load landlord rent monitoring.");
  }

  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[];
  const tenantProfileIds = unique(assignments.map((item) => item.tenant_profile_id));

  const [tenantProfilesResult, unitContext] = await Promise.all([
    tenantProfileIds.length
      ? supabase.from("tenant_profiles").select("id, profile_id").in("id", tenantProfileIds)
      : Promise.resolve({ data: [], error: null }),
    loadUnitContext(supabase, assignments),
  ]);

  if (tenantProfilesResult.error) {
    throw new Error("Unable to load landlord rent monitoring.");
  }

  const tenantProfiles = (tenantProfilesResult.data ?? []) as Pick<TenantProfileRow, "id" | "profile_id">[];
  const profileIds = unique(tenantProfiles.map((item) => item.profile_id));
  const profilesResult = profileIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name, profile_photo_url").in("id", profileIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    throw new Error("Unable to load landlord rent monitoring.");
  }

  const assignmentMap = new Map(assignments.map((item) => [item.id, item]));
  const tenantProfileToProfileMap = new Map(tenantProfiles.map((item) => [item.id, item.profile_id]));
  const profileNameMap = new Map(
    ((profilesResult.data ?? []) as Array<{ id: string; first_name: string; last_name: string; profile_photo_url: string | null }>).map((profile) => [
      profile.id,
      `${profile.first_name} ${profile.last_name}`.trim(),
    ]),
  );
  const profilePhotoMap = new Map(
    ((profilesResult.data ?? []) as Array<{ id: string; profile_photo_url: string | null }>).map((profile) => [profile.id, profile.profile_photo_url]),
  );
  const unitMap = new Map(unitContext.units.map((unit) => [unit.id, unit.unit_name]));
  const roomMap = new Map(unitContext.rooms.map((room) => [room.id, room.room_number]));
  const bedMap = new Map(unitContext.bedSpaces.map((bed) => [bed.id, bed.bed_label]));

  return obligations.map((obligation) => {
    const assignment = assignmentMap.get(obligation.tenant_assignment_id);
    const profileId = assignment ? tenantProfileToProfileMap.get(assignment.tenant_profile_id) : undefined;

    return {
      rentalObligationId: obligation.id,
      tenantProfileId: assignment?.tenant_profile_id ?? "",
      tenantName: profileId ? profileNameMap.get(profileId) ?? "Tenant" : "Tenant",
      tenantProfilePhotoUrl: profileId ? profilePhotoMap.get(profileId) ?? null : null,
      unitName: assignment ? unitMap.get(assignment.unit_id) ?? null : null,
      roomNumber: assignment?.room_id ? roomMap.get(assignment.room_id) ?? null : null,
      bedLabel: assignment?.bed_space_id ? bedMap.get(assignment.bed_space_id) ?? null : null,
      assignmentType: assignment?.assignment_type ?? null,
      dueDate: obligation.due_date,
      amountDue: obligation.amount_due,
      amountPaid: obligation.amount_paid,
      balance: Math.max(obligation.amount_due - obligation.amount_paid, 0),
      dueStatus: getCurrentDueStatus(obligation.due_date, obligation.payment_status),
      paymentStatus: obligation.payment_status,
    } satisfies LandlordRentMonitoringItem;
  });
}

export async function getLandlordNotifications(): Promise<LandlordNotificationItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("id, notification_type, title, message, reference_type, reference_id, is_read, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load landlord notifications.");
  }

  return ((data ?? []) as NotificationRow[]).map((item) => ({
    id: item.id,
    notificationType: item.notification_type,
    title: item.title,
    message: item.message,
    referenceType: item.reference_type,
    referenceId: item.reference_id,
    isRead: item.is_read,
    createdAt: item.created_at,
  }));
}

export async function getPendingTenantRegistrationCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "tenant")
    .eq("account_status", "pending");

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getLandlordReportsSnapshot(): Promise<LandlordReportsSnapshot> {
  const [tenants, payments, maintenance, obligations] = await Promise.all([
    getLandlordTenants(),
    getLandlordPayments(),
    getLandlordMaintenanceRequests(),
    getLandlordRentMonitoring(),
  ]);

  const totalAmountDue = obligations.reduce((sum, item) => sum + item.amountDue, 0);
  const totalAmountPaid = obligations.reduce((sum, item) => sum + item.amountPaid, 0);
  const overdueObligations = obligations.filter((item) => item.dueStatus === "overdue" && item.paymentStatus !== "paid" && item.balance > 0);

  return {
    tenantsCount: tenants.length,
    assignedTenantsCount: tenants.filter((item) => item.assignmentType !== null).length,
    paymentsCount: payments.length,
    verifiedPaymentsCount: payments.filter((item) => item.verificationStatus === "verified").length,
    pendingPaymentsCount: payments.filter((item) => item.verificationStatus === "pending").length,
    maintenanceCount: maintenance.length,
    pendingMaintenanceCount: maintenance.filter((item) => item.status === "pending").length,
    obligationsCount: obligations.length,
    paidObligationsCount: obligations.filter((item) => item.paymentStatus === "paid").length,
    overdueObligationsCount: overdueObligations.length,
    totalAmountDue,
    totalAmountPaid,
    outstandingBalance: overdueObligations.reduce((sum, item) => sum + item.balance, 0),
  };
}