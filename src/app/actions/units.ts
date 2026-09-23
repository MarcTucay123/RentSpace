"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireFeatureAccess } from "@/lib/features/access";
import { capitalizeFirstLetter } from "@/lib/text/format";
import type { UnitFormState } from "@/lib/units/types";
import { createClient } from "@/utils/supabase/server";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nameValue(formData: FormData, key: string) {
  return capitalizeFirstLetter(textValue(formData, key));
}

function parseOptionalRate(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

export async function createUnit(
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  await requireFeatureAccess("units");
  const supabase = await createClient();

  const unitName = nameValue(formData, "unitName");
  const unitCategory = textValue(formData, "unitCategory");
  const description = textValue(formData, "description");
  const status = textValue(formData, "status");
  const rentalRateValue = parseOptionalRate(textValue(formData, "rentalRate"));

  const errors: Record<string, string[]> = {};

  if (!unitName) errors.unitName = ["Unit name is required."];
  if (!["bed_space", "room_space", "apartment"].includes(unitCategory)) {
    errors.unitCategory = ["Select a valid unit category."];
  }
  if (!["active", "inactive"].includes(status)) {
    errors.status = ["Select a valid unit status."];
  }
  if (Number.isNaN(rentalRateValue)) errors.rentalRate = ["Rental rate must be a valid non-negative number."];

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, message: "Please correct the unit details." };
  }

  const { data, error } = await supabase
    .from("units")
    .insert({
      unit_name: unitName,
      unit_category: unitCategory,
      description: description || null,
      rental_rate: unitCategory === "apartment" ? rentalRateValue : null,
      status,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, message: error?.code === "PGRST204" ? "Apartment rental rates are not installed yet. Run migration 20260915_004 in Supabase, then try again." : "Unable to create the unit right now." };
  }

  revalidatePath("/landlord/units");
  redirect(`/landlord/units/${data.id}`);
}

export async function updateUnit(
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  await requireFeatureAccess("units");
  const supabase = await createClient();

  const unitId = textValue(formData, "unitId");
  const unitName = nameValue(formData, "unitName");
  const description = textValue(formData, "description");
  const status = textValue(formData, "status");
  const rentalRateValue = parseOptionalRate(textValue(formData, "rentalRate"));

  const errors: Record<string, string[]> = {};
  if (!unitName) errors.unitName = ["Unit name is required."];
  if (!["active", "inactive"].includes(status)) {
    errors.status = ["Select a valid unit status."];
  }
  if (Number.isNaN(rentalRateValue)) errors.rentalRate = ["Rental rate must be a valid non-negative number."];

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, message: "Please correct the unit details." };
  }

  const { error } = await supabase
    .from("units")
    .update({
      unit_name: unitName,
      description: description || null,
      rental_rate: rentalRateValue,
      status,
    })
    .eq("id", unitId);

  if (error) {
    return { success: false, message: error.code === "PGRST204" ? "Apartment rental rates are not installed yet. Run migration 20260915_004 in Supabase, then try again." : "Unable to update the unit right now." };
  }

  revalidatePath("/landlord/units");
  revalidatePath(`/landlord/units/${unitId}`);
  return { success: true, message: "Unit updated successfully." };
}

export async function createRoom(
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  await requireFeatureAccess("units");
  const supabase = await createClient();

  const unitId = textValue(formData, "unitId");
  const unitCategory = textValue(formData, "unitCategory");
  const roomNumber = nameValue(formData, "roomNumber");
  const status = textValue(formData, "status") || "active";
  const rentalRateValue = parseOptionalRate(textValue(formData, "rentalRate"));
  const bedSpaceCount = Number(textValue(formData, "bedSpaceCount") || 0);

  const errors: Record<string, string[]> = {};
  if (!roomNumber) errors.roomNumber = ["Room name is required."];
  if (Number.isNaN(rentalRateValue)) errors.rentalRate = ["Rental rate must be a valid non-negative number."];
  if (!["active", "inactive"].includes(status)) errors.status = ["Select a valid room status."];
  if (unitCategory === "bed_space" && (!Number.isInteger(bedSpaceCount) || bedSpaceCount < 1)) {
    errors.bedSpaceCount = ["Enter at least 1 bed space to generate."];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, message: "Please correct the room details." };
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      unit_id: unitId,
      room_number: roomNumber,
      rental_rate: rentalRateValue,
      status,
    })
    .select("id")
    .single();

  if (roomError || !room) {
    const duplicate = roomError?.message.toLowerCase().includes("duplicate") || roomError?.message.toLowerCase().includes("unique");
    return {
      success: false,
      message: duplicate
        ? "That room name already exists inside this unit."
        : "Unable to create the room right now.",
    };
  }

  if (unitCategory === "bed_space") {
    const generatedBedSpaces = Array.from({ length: bedSpaceCount }, (_, index) => ({
      room_id: room.id,
      bed_label: `Bed Space ${index + 1}`,
      rental_rate: rentalRateValue,
      status: "available",
    }));

    const { error: bedSpaceError } = await supabase.from("bed_spaces").insert(generatedBedSpaces);

    if (bedSpaceError) {
      return {
        success: false,
        message: "Room created, but automatic bed space generation failed. Please add them manually later.",
      };
    }
  }

  revalidatePath("/landlord/units");
  revalidatePath(`/landlord/units/${unitId}`);
  return { success: true, message: "Room created successfully." };
}

export async function updateRoom(
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  await requireFeatureAccess("units");
  const supabase = await createClient();

  const unitId = textValue(formData, "unitId");
  const roomId = textValue(formData, "roomId");
  const roomNumber = nameValue(formData, "roomNumber");
  const status = textValue(formData, "status");
  const rentalRateValue = parseOptionalRate(textValue(formData, "rentalRate"));

  const errors: Record<string, string[]> = {};
  if (!roomNumber) errors.roomNumber = ["Room name is required."];
  if (Number.isNaN(rentalRateValue)) errors.rentalRate = ["Rental rate must be a valid non-negative number."];
  if (!["active", "inactive"].includes(status)) errors.status = ["Select a valid room status."];

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, message: "Please correct the room details." };
  }

  const { data: activeAssignment } = await supabase
    .from("tenant_assignments")
    .select("id")
    .eq("room_id", roomId)
    .eq("status", "active")
    .maybeSingle();

  if (status === "inactive" && activeAssignment) {
    return {
      success: false,
      message: "This room cannot be deactivated while it has an active tenant assignment.",
    };
  }

  const { error } = await supabase
    .from("rooms")
    .update({ room_number: roomNumber, rental_rate: rentalRateValue, status })
    .eq("id", roomId);

  if (error) {
    const duplicate = error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("unique");
    return {
      success: false,
      message: duplicate
        ? "That room name already exists inside this unit."
        : "Unable to update the room right now.",
    };
  }

  revalidatePath("/landlord/units");
  revalidatePath(`/landlord/units/${unitId}`);
  return { success: true, message: "Room updated successfully." };
}

export async function createBedSpace(
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  await requireFeatureAccess("units");
  const supabase = await createClient();

  const unitId = textValue(formData, "unitId");
  const roomId = textValue(formData, "roomId");
  const bedLabel = nameValue(formData, "bedLabel");
  const status = "available";
  const rentalRateValue = parseOptionalRate(textValue(formData, "rentalRate"));

  const errors: Record<string, string[]> = {};
  if (!bedLabel) errors.bedLabel = ["Bed space label is required."];
  if (Number.isNaN(rentalRateValue)) errors.rentalRate = ["Rental rate must be a valid non-negative number."];

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, message: "Please correct the bed space details." };
  }

  const { error } = await supabase.from("bed_spaces").insert({
    room_id: roomId,
    bed_label: bedLabel,
    rental_rate: rentalRateValue,
    status,
  });

  if (error) {
    const duplicate = error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("unique");
    return {
      success: false,
      message: duplicate
        ? "That bed space label already exists inside this room."
        : "Unable to create the bed space right now.",
    };
  }

  revalidatePath("/landlord/units");
  revalidatePath(`/landlord/units/${unitId}`);
  return { success: true, message: "Bed space created successfully." };
}

export async function updateBedSpace(
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  await requireFeatureAccess("units");
  const supabase = await createClient();

  const unitId = textValue(formData, "unitId");
  const bedSpaceId = textValue(formData, "bedSpaceId");
  const bedLabel = nameValue(formData, "bedLabel");
  const rentalRateValue = parseOptionalRate(textValue(formData, "rentalRate"));

  const errors: Record<string, string[]> = {};
  if (!bedLabel) errors.bedLabel = ["Bed space label is required."];
  if (Number.isNaN(rentalRateValue)) errors.rentalRate = ["Rental rate must be a valid non-negative number."];

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, message: "Please correct the bed space details." };
  }

  const { error } = await supabase
    .from("bed_spaces")
    .update({ bed_label: bedLabel, rental_rate: rentalRateValue })
    .eq("id", bedSpaceId);

  if (error) {
    const duplicate = error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("unique");
    return {
      success: false,
      message: duplicate
        ? "That bed space label already exists inside this room."
        : "Unable to update the bed space right now.",
    };
  }

  revalidatePath("/landlord/units");
  revalidatePath(`/landlord/units/${unitId}`);
  return { success: true, message: "Bed space updated successfully." };
}

export async function removeUnusedUnits(unitIds: string[]): Promise<UnitFormState> {
  await requireFeatureAccess("units");
  const normalizedIds = Array.from(new Set(unitIds.map((id) => id.trim()).filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))));
  if (normalizedIds.length === 0) return { success: false, message: "Select at least one unit to remove." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_unused_units", { p_unit_ids: normalizedIds });
  if (error) {
    return { success: false, message: ["PGRST202", "42883"].includes(error.code) ? "Protected unit removal is not installed yet. Apply migration 20260916_008 in Supabase." : error.message };
  }

  const result = Array.isArray(data) ? data[0] : data;
  const removedCount = Number(result?.removed_count ?? 0);
  const protectedCount = Number(result?.protected_count ?? 0);
  revalidatePath("/landlord/units");

  if (removedCount === 0 && protectedCount > 0) return { success: false, message: "The selected unit records are protected because they have tenant assignment or maintenance history." };
  if (protectedCount > 0) return { success: true, message: `${removedCount} unit${removedCount === 1 ? "" : "s"} removed. ${protectedCount} protected unit${protectedCount === 1 ? " was" : "s were"} kept because historical records exist.` };
  return { success: true, message: `${removedCount} unit${removedCount === 1 ? "" : "s"} removed successfully.` };
}

export async function removeUnusedUnitStructure(
  unitId: string,
  roomIds: string[],
  bedSpaceIds: string[],
): Promise<UnitFormState> {
  await requireFeatureAccess("units");
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const normalizedUnitId = unitId.trim();
  const normalizedRoomIds = Array.from(new Set(roomIds.map((id) => id.trim()).filter((id) => uuidPattern.test(id))));
  const normalizedBedIds = Array.from(new Set(bedSpaceIds.map((id) => id.trim()).filter((id) => uuidPattern.test(id))));
  if (!uuidPattern.test(normalizedUnitId) || (normalizedRoomIds.length === 0 && normalizedBedIds.length === 0)) {
    return { success: false, message: "Select at least one room or bed space to remove." };
  }

  const supabase = await createClient();
  const occupancyChecks = await Promise.all([
    normalizedBedIds.length
      ? supabase.from("tenant_assignments").select("id", { count: "exact", head: true }).in("bed_space_id", normalizedBedIds).eq("assignment_type", "bed_space").eq("status", "active")
      : Promise.resolve({ count: 0, error: null }),
    normalizedRoomIds.length
      ? supabase.from("tenant_assignments").select("id", { count: "exact", head: true }).in("room_id", normalizedRoomIds).eq("assignment_type", "room_space").eq("status", "active")
      : Promise.resolve({ count: 0, error: null }),
    normalizedRoomIds.length
      ? supabase.from("tenant_assignments").select("id", { count: "exact", head: true }).in("room_id", normalizedRoomIds).eq("assignment_type", "bed_space").eq("status", "active")
      : Promise.resolve({ count: 0, error: null }),
  ]);
  const occupancyError = occupancyChecks.find((check) => check.error)?.error;
  if (occupancyError) return { success: false, message: occupancyError.message };
  if (occupancyChecks.some((check) => Number(check.count ?? 0) > 0)) {
    return { success: false, message: "The selected rooms or bed spaces cannot be removed because a tenant is currently assigned." };
  }

  const { data, error } = await supabase.rpc("remove_unused_unit_structure", {
    p_unit_id: normalizedUnitId,
    p_room_ids: normalizedRoomIds,
    p_bed_space_ids: normalizedBedIds,
  });
  if (error) return { success: false, message: ["PGRST202", "42883"].includes(error.code) ? "Current-assignment room and bed removal is not installed yet. Apply migrations through 20260916_013 in Supabase." : error.message };

  const result = Array.isArray(data) ? data[0] : data;
  const removedRooms = Number(result?.removed_rooms ?? 0);
  const protectedRooms = Number(result?.protected_rooms ?? 0);
  const removedBeds = Number(result?.removed_bed_spaces ?? 0);
  const protectedBeds = Number(result?.protected_bed_spaces ?? 0);
  const removedTotal = removedRooms + removedBeds;
  const protectedTotal = protectedRooms + protectedBeds;
  revalidatePath("/landlord/units");
  revalidatePath(`/landlord/units/${normalizedUnitId}`);

  if (removedTotal === 0 && protectedTotal > 0) return { success: false, message: "This available room or bed space was blocked by an outdated database rule. Apply migrations through 20260916_013 in Supabase, then try again." };
  const removedParts = [removedRooms ? `${removedRooms} room${removedRooms === 1 ? "" : "s"}` : null, removedBeds ? `${removedBeds} bed space${removedBeds === 1 ? "" : "s"}` : null].filter(Boolean).join(" and ");
  return { success: true, message: protectedTotal > 0 ? `${removedParts} removed. ${protectedTotal} record${protectedTotal === 1 ? " was" : "s were"} kept because a tenant is currently assigned.` : `${removedParts} removed successfully.` };
}