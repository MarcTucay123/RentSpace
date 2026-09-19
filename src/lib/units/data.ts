import { createClient } from "@/utils/supabase/server";

import type { BedSpace, Room, Unit, UnitListItem } from "./types";

type AssignmentRow = {
  tenant_profile_id: string;
  unit_id: string;
  room_id: string | null;
  bed_space_id: string | null;
  assignment_type: "bed_space" | "room_space" | "apartment";
  status: "active" | "completed" | "cancelled";
};

export async function getUnitsWithStructure() {
  const supabase = await createClient();

  const [{ data: units, error: unitsError }, { data: rooms, error: roomsError }, { data: bedSpaces, error: bedSpacesError }, { data: assignments, error: assignmentsError }, { data: tenantProfiles, error: tenantProfilesError }, { data: tenantIdentities, error: tenantIdentitiesError }] =
    await Promise.all([
      supabase.from("units").select("*").order("created_at", { ascending: true }),
      supabase.from("rooms").select("*").order("room_number", { ascending: true }),
      supabase.from("bed_spaces").select("*").order("bed_label", { ascending: true }),
      supabase
        .from("tenant_assignments")
        .select("tenant_profile_id, unit_id, room_id, bed_space_id, assignment_type, status")
        .eq("status", "active"),
      supabase.from("tenant_profiles").select("id, profile_id"),
      supabase.from("profiles").select("id, first_name, last_name, profile_photo_url").eq("role", "tenant").eq("account_status", "approved"),
    ]);

  if (unitsError || roomsError || bedSpacesError || assignmentsError || tenantProfilesError || tenantIdentitiesError) {
    const details = [unitsError, roomsError, bedSpacesError, assignmentsError, tenantProfilesError, tenantIdentitiesError]
      .filter((error) => error !== null)
      .map((error) => error.message)
      .join(" | ");

    throw new Error(details || "Unable to load unit records right now.");
  }

  const unitRows = ((units ?? []) as Array<Omit<Unit, "rental_rate"> & { rental_rate?: number | null }>).map((unit) => ({
    ...unit,
    rental_rate: unit.rental_rate ?? null,
  }));
  const roomRows = (rooms ?? []) as Room[];
  const bedSpaceRows = (bedSpaces ?? []) as BedSpace[];
  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const profileIdByTenantId = new Map((tenantProfiles ?? []).map((tenant) => [tenant.id, tenant.profile_id]));
  const identityByProfileId = new Map((tenantIdentities ?? []).map((identity) => [identity.id, identity]));

  function getOccupant(assignment: AssignmentRow) {
    const profileId = profileIdByTenantId.get(assignment.tenant_profile_id);
    const identity = profileId ? identityByProfileId.get(profileId) : null;
    if (!profileId || !identity) return null;
    return {
      profile_id: profileId,
      name: `${identity.first_name} ${identity.last_name}`.trim(),
      profile_photo_url: identity.profile_photo_url,
    };
  }

  return unitRows.map<UnitListItem>((unit) => {
    const unitRooms = roomRows.filter((room) => room.unit_id === unit.id);
    const occupiedBedSpaceIds = assignmentRows
      .filter((assignment) => assignment.assignment_type === "bed_space" && assignment.unit_id === unit.id)
      .flatMap((assignment) => assignment.bed_space_id ? [assignment.bed_space_id] : []);
    const unitBedSpaces = bedSpaceRows
      .filter((bedSpace) => unitRooms.some((room) => room.id === bedSpace.room_id))
      .map((bedSpace) => ({
        ...bedSpace,
        status: bedSpace.status === "inactive"
          ? "inactive" as const
          : occupiedBedSpaceIds.includes(bedSpace.id) ? "occupied" as const : "available" as const,
      }));

    const occupiedRoomCount = assignmentRows.filter(
      (assignment) =>
        assignment.assignment_type === "room_space" &&
        assignment.unit_id === unit.id &&
        assignment.room_id !== null,
    ).length;

    const occupiedBedSpaceCount = assignmentRows.filter(
      (assignment) =>
        assignment.assignment_type === "bed_space" && assignment.unit_id === unit.id && assignment.bed_space_id !== null,
    ).length;

    const apartmentIsOccupied = assignmentRows.some(
      (assignment) => assignment.assignment_type === "apartment" && assignment.unit_id === unit.id,
    );
    const roomOccupants = Object.fromEntries(assignmentRows
      .filter((assignment) => assignment.assignment_type === "room_space" && assignment.unit_id === unit.id && assignment.room_id)
      .flatMap((assignment) => {
        const occupant = getOccupant(assignment);
        return occupant && assignment.room_id ? [[assignment.room_id, occupant]] : [];
      }));
    const bedSpaceOccupants = Object.fromEntries(assignmentRows
      .filter((assignment) => assignment.assignment_type === "bed_space" && assignment.unit_id === unit.id && assignment.bed_space_id)
      .flatMap((assignment) => {
        const occupant = getOccupant(assignment);
        return occupant && assignment.bed_space_id ? [[assignment.bed_space_id, occupant]] : [];
      }));
    const apartmentAssignment = assignmentRows.find((assignment) => assignment.assignment_type === "apartment" && assignment.unit_id === unit.id);

    return {
      ...unit,
      rooms: unitRooms,
      bed_spaces: unitBedSpaces,
      occupied_room_count: occupiedRoomCount,
      occupied_bed_space_count: occupiedBedSpaceCount,
      occupied_room_ids: assignmentRows
        .filter((assignment) => assignment.assignment_type === "room_space" && assignment.unit_id === unit.id)
        .flatMap((assignment) => assignment.room_id ? [assignment.room_id] : []),
      occupied_bed_space_ids: occupiedBedSpaceIds,
      apartment_is_occupied: apartmentIsOccupied,
      room_occupants: roomOccupants,
      bed_space_occupants: bedSpaceOccupants,
      apartment_occupant: apartmentAssignment ? getOccupant(apartmentAssignment) : null,
    };
  });
}

export async function getUnitById(unitId: string) {
  const units = await getUnitsWithStructure();
  return units.find((unit) => unit.id === unitId) ?? null;
}