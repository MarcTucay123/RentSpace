import type { Profile } from "@/lib/auth/types";
import { createClient } from "@/utils/supabase/server";

export type MessageContact = Pick<Profile, "id" | "first_name" | "last_name" | "email" | "role" | "profile_photo_url"> & {
  assignmentLabel: string | null;
};

export type DirectMessage = {
  id: string;
  senderProfileId: string;
  recipientProfileId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export async function getMessagingData(profile: Profile) {
  const supabase = await createClient();
  const contactRole = profile.role === "landlord" ? "tenant" : "landlord";

  const [contactsResult, messagesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, profile_photo_url")
      .eq("role", contactRole)
      .eq("account_status", "approved")
      .order("last_name", { ascending: true }),
    supabase
      .from("messages")
      .select("id, sender_profile_id, recipient_profile_id, body, is_read, created_at")
      .or(`sender_profile_id.eq.${profile.id},recipient_profile_id.eq.${profile.id}`)
      .order("created_at", { ascending: true }),
  ]);

  if (contactsResult.error || messagesResult.error) {
    return {
      contacts: [] as MessageContact[],
      messages: [] as DirectMessage[],
      setupRequired: true,
      errorCode: contactsResult.error?.code ?? messagesResult.error?.code ?? null,
    };
  }

  const contactRows = contactsResult.data ?? [];
  const assignmentLabels = new Map<string, string>();
  if (profile.role === "landlord" && contactRows.length > 0) {
    const tenantProfilesResult = await supabase.from("tenant_profiles").select("id, profile_id").in("profile_id", contactRows.map((contact) => contact.id));
    const tenantProfiles = tenantProfilesResult.data ?? [];
    if (!tenantProfilesResult.error && tenantProfiles.length > 0) {
      const assignmentsResult = await supabase.from("tenant_assignments").select("tenant_profile_id, assignment_type, unit_id, room_id, bed_space_id").in("tenant_profile_id", tenantProfiles.map((tenant) => tenant.id)).eq("status", "active");
      const assignments = assignmentsResult.data ?? [];
      const unitIds = [...new Set(assignments.map((assignment) => assignment.unit_id))];
      const roomIds = [...new Set(assignments.flatMap((assignment) => assignment.room_id ? [assignment.room_id] : []))];
      const bedIds = [...new Set(assignments.flatMap((assignment) => assignment.bed_space_id ? [assignment.bed_space_id] : []))];
      const [unitsResult, roomsResult, bedsResult] = await Promise.all([
        unitIds.length ? supabase.from("units").select("id, unit_name").in("id", unitIds) : Promise.resolve({ data: [], error: null }),
        roomIds.length ? supabase.from("rooms").select("id, room_number").in("id", roomIds) : Promise.resolve({ data: [], error: null }),
        bedIds.length ? supabase.from("bed_spaces").select("id, bed_label").in("id", bedIds) : Promise.resolve({ data: [], error: null }),
      ]);
      const unitNames = new Map((unitsResult.data ?? []).map((unit) => [unit.id, unit.unit_name]));
      const roomNames = new Map((roomsResult.data ?? []).map((room) => [room.id, room.room_number]));
      const bedNames = new Map((bedsResult.data ?? []).map((bed) => [bed.id, bed.bed_label]));
      const profileIds = new Map(tenantProfiles.map((tenant) => [tenant.id, tenant.profile_id]));
      assignments.forEach((assignment) => {
        const profileId = profileIds.get(assignment.tenant_profile_id);
        if (!profileId) return;
        const unitName = unitNames.get(assignment.unit_id) ?? "Unit";
        if (assignment.assignment_type === "apartment") assignmentLabels.set(profileId, `Apartment: ${unitName}`);
        else if (assignment.assignment_type === "room_space") assignmentLabels.set(profileId, `${unitName} • Room: ${roomNames.get(assignment.room_id ?? "") ?? "assigned"}`);
        else assignmentLabels.set(profileId, `${unitName} • Room: ${roomNames.get(assignment.room_id ?? "") ?? "assigned"} • ${bedNames.get(assignment.bed_space_id ?? "") ?? "Bed assigned"}`);
      });
    }
  }

  return {
    contacts: contactRows.map((contact) => ({ ...contact, assignmentLabel: assignmentLabels.get(contact.id) ?? null })) as MessageContact[],
    messages: (messagesResult.data ?? []).map((message) => ({
      id: message.id,
      senderProfileId: message.sender_profile_id,
      recipientProfileId: message.recipient_profile_id,
      body: message.body,
      isRead: message.is_read,
      createdAt: message.created_at,
    })),
    setupRequired: false,
    errorCode: null,
  };
}