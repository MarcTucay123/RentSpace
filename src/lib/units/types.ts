export type UnitCategory = "bed_space" | "room_space" | "apartment";
export type UnitStatus = "active" | "inactive";
export type BedSpaceStatus = "available" | "occupied" | "inactive";

export function getUnitCategoryLabel(category: UnitCategory) {
  if (category === "bed_space") return "Bed Space Unit";
  if (category === "room_space") return "Room Space Unit";
  return "Apartment Unit";
}

export type Unit = {
  id: string;
  unit_name: string;
  unit_category: UnitCategory;
  description: string | null;
  rental_rate: number | null;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  unit_id: string;
  room_number: string;
  rental_rate: number | null;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
};

export type BedSpace = {
  id: string;
  room_id: string;
  bed_label: string;
  rental_rate: number | null;
  status: BedSpaceStatus;
  created_at: string;
  updated_at: string;
};

export type UnitFormState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export type UnitOccupant = {
  profile_id: string;
  name: string;
  profile_photo_url: string | null;
};

export type UnitListItem = Unit & {
  rooms: Room[];
  bed_spaces: BedSpace[];
  occupied_room_count: number;
  occupied_bed_space_count: number;
  occupied_room_ids: string[];
  occupied_bed_space_ids: string[];
  apartment_is_occupied: boolean;
  room_occupants: Record<string, UnitOccupant>;
  bed_space_occupants: Record<string, UnitOccupant>;
  apartment_occupant: UnitOccupant | null;
};