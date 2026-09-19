"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { removeUnusedUnitStructure } from "@/app/actions/units";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { getUnitCategoryLabel, type UnitListItem } from "@/lib/units/types";

import { BedSpaceForm } from "./unit-forms/bed-space-form";
import { RoomForm } from "./unit-forms/room-form";
import { UnitEditForm } from "./unit-forms/unit-edit-form";
import { FormModal } from "@/components/ui/form-modal";

type UnitDetailsPageProps = {
  unit: UnitListItem;
};

export function UnitDetailsPage({ unit }: UnitDetailsPageProps) {
  const [editingUnit, setEditingUnit] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingBedSpaceId, setEditingBedSpaceId] = useState<string | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);
  const [addingBedToRoomId, setAddingBedToRoomId] = useState<string | null>(null);
  const [roomQuery, setRoomQuery] = useState("");
  const [roomRemovalMode, setRoomRemovalMode] = useState(false);
  const [bedRemovalRoomId, setBedRemovalRoomId] = useState<string | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedBedIds, setSelectedBedIds] = useState<string[]>([]);
  const [removalRequest, setRemovalRequest] = useState<{ roomIds: string[]; bedIds: string[]; label: string } | null>(null);
  const [removalMessage, setRemovalMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [removing, startRemoval] = useTransition();
  const router = useRouter();
  const totalAvailableBedSpaces = unit.bed_spaces.filter((bedSpace) => bedSpace.status === "available").length;
  const totalActiveRooms = unit.rooms.filter((room) => room.status === "active").length;
  const totalAvailableRooms = Math.max(totalActiveRooms - unit.occupied_room_count, 0);
  const normalizedRoomQuery = roomQuery.trim().toLocaleLowerCase();
  const visibleRooms = unit.rooms.filter((room) => !normalizedRoomQuery || room.room_number.toLocaleLowerCase().includes(normalizedRoomQuery));

  function toggleSelection(id: string, type: "room" | "bed") {
    setRemovalMessage(null);
    if (type === "room") setSelectedRoomIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    else setSelectedBedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function confirmRemoval() {
    if (!removalRequest) return;
    const request = removalRequest;
    setRemovalRequest(null);
    startRemoval(async () => {
      const result = await removeUnusedUnitStructure(unit.id, request.roomIds, request.bedIds);
      setRemovalMessage({ success: Boolean(result.success), text: result.message ?? "Removal completed." });
      if (result.success) {
        setSelectedRoomIds([]);
        setSelectedBedIds([]);
        setRoomRemovalMode(false);
        setBedRemovalRoomId(null);
        router.refresh();
      }
    });
  }

  const stats =
    unit.unit_category === "bed_space"
      ? [
          { label: "Total Rooms", value: String(unit.rooms.length) },
          { label: "Total Bed Spaces", value: String(unit.bed_spaces.length) },
          { label: "Occupied Bed Spaces", value: String(unit.occupied_bed_space_count) },
          { label: "Available Bed Spaces", value: String(totalAvailableBedSpaces) },
        ]
      : unit.unit_category === "room_space"
        ? [
            { label: "Total Rooms", value: String(unit.rooms.length) },
            { label: "Occupied Rooms", value: String(unit.occupied_room_count) },
            { label: "Available Rooms", value: String(totalAvailableRooms) },
            { label: "Unit Status", value: unit.status },
          ]
        : [
            { label: "Availability", value: unit.apartment_is_occupied ? "Occupied" : "Available" },
            { label: "Unit Status", value: unit.status },
            { label: "Category", value: "Apartment Unit" },
             { label: "Rental Rate", value: unit.rental_rate === null ? "Not set" : `₱${unit.rental_rate.toLocaleString()}` },
          ];

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] border border-[var(--color-dormmate-border)] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">
              Unit Overview
            </p>
            <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">{unit.unit_name}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-dormmate-muted)]">
              Category: <span className="font-semibold text-[var(--color-dormmate-text)]">{getUnitCategoryLabel(unit.unit_category)}</span>
            </p>
            {unit.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-dormmate-muted)]">{unit.description}</p>
            ) : null}
            {unit.unit_category === "apartment" && unit.apartment_occupant ? (
              <div className="mt-3 flex w-fit items-center gap-2 rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-3 py-2">
                <ProfileAvatar photoUrl={unit.apartment_occupant.profile_photo_url} name={unit.apartment_occupant.name} assignmentLabel={unit.unit_name} className="h-8 w-8" />
                <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-dormmate-muted)]">Current Tenant</p><p className="text-sm font-semibold text-[#1b263b]">{unit.apartment_occupant.name}</p></div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-expanded={editingUnit}
              onClick={() => setEditingUnit(true)}
              className="rounded-[12px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Edit Unit
            </button>
            {unit.unit_category !== "apartment" ? (
              <>
                <button type="button" onClick={() => setAddingRoom(true)} className="rounded-[12px] border border-[var(--color-dormmate-primary)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-dormmate-primary)] shadow-sm transition hover:bg-[var(--color-dormmate-surface)]">Add Room</button>
                <button type="button" onClick={() => { setRoomRemovalMode((current) => !current); setSelectedRoomIds([]); setBedRemovalRoomId(null); setSelectedBedIds([]); }} className="rounded-[12px] border border-[#d45f43] bg-white px-4 py-2.5 text-sm font-semibold text-[#b9472f] shadow-sm transition hover:bg-[#fff1ed]">{roomRemovalMode ? "Cancel Room Removal" : "Remove Room"}</button>
              </>
            ) : null}
            <Link href="/landlord/units" className="rounded-[12px] border border-[var(--color-dormmate-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-dormmate-primary)] shadow-sm transition hover:bg-[var(--color-dormmate-surface)]">
              Back to Units
            </Link>
          </div>
        </div>
      </section>

      {removalMessage?.success ? <div className="rounded-[1rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{removalMessage.text}</div> : null}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 rounded-[1rem] border border-[var(--color-dormmate-border)] bg-white p-3 shadow-sm sm:rounded-[1.15rem] sm:p-4">
            <p className="truncate text-xs text-[var(--color-dormmate-muted)] sm:text-sm">{stat.label}</p>
            <p className="mt-1 truncate text-xl font-semibold sm:mt-1.5 sm:text-[1.45rem]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        {unit.unit_category === "bed_space" ? (
          <section className="rounded-[1.35rem] border border-[var(--color-dormmate-border)] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Room and Bed Space Structure</p>
              {roomRemovalMode ? <div className="flex items-center gap-3"><span className="text-xs text-[var(--color-dormmate-muted)]">{selectedRoomIds.length} room{selectedRoomIds.length === 1 ? "" : "s"} selected</span><button type="button" disabled={removing || selectedRoomIds.length === 0} onClick={() => setRemovalRequest({ roomIds: selectedRoomIds, bedIds: [], label: "selected rooms" })} className="rounded-[10px] bg-[#c65f43] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Remove Selected Rooms</button></div> : null}
            </div>
            <label className="mt-4 block">
              <span className="sr-only">Search by room name</span>
              <input type="search" value={roomQuery} onChange={(event) => setRoomQuery(event.target.value)} placeholder="Search by Room Name" autoComplete="off" className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-dormmate-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]" />
            </label>
            <div className="mt-5 space-y-4">
              {visibleRooms.length === 0 ? (
                <p className="text-sm text-[var(--color-dormmate-muted)]">{unit.rooms.length === 0 ? "No rooms have been added yet." : "No rooms match your search."}</p>
              ) : (
                visibleRooms.map((room) => {
                  const roomBedSpaces = unit.bed_spaces.filter((bedSpace) => bedSpace.room_id === room.id);
                  const roomHasOccupant = roomBedSpaces.some((bedSpace) => unit.occupied_bed_space_ids.includes(bedSpace.id));

                  return (
                    <div key={room.id} className="rounded-[1.15rem] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {roomRemovalMode ? <input type="checkbox" aria-label={`Select room ${room.room_number}`} disabled={roomHasOccupant} title={roomHasOccupant ? "Move out the currently assigned tenant before removing this room." : undefined} checked={selectedRoomIds.includes(room.id)} onChange={() => toggleSelection(room.id, "room")} className="mt-1 h-4 w-4 accent-[#c65f43] disabled:cursor-not-allowed disabled:opacity-40" /> : null}
                          <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-dormmate-muted)]">Room Name</p><h4 className="text-base font-semibold">{room.room_number}</h4>
                          <p className="text-sm text-[var(--color-dormmate-muted)]">
                            Status: {room.status} {room.rental_rate !== null ? `• Rate: ₱${room.rental_rate}` : ""}
                          </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                          <button type="button" aria-expanded={editingRoomId === room.id} onClick={() => setEditingRoomId((current) => current === room.id ? null : room.id)} className="rounded-[10px] border border-[var(--color-dormmate-primary)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-dormmate-primary)] transition hover:bg-[var(--color-dormmate-surface)]">
                            {editingRoomId === room.id ? "Cancel" : "Edit"}
                          </button>
                          <button type="button" onClick={() => setAddingBedToRoomId(room.id)} className="rounded-[10px] bg-[var(--color-dormmate-primary)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">Add Bed</button>
                          <button type="button" disabled={removing} onClick={() => { const opening = bedRemovalRoomId !== room.id; setBedRemovalRoomId(opening ? room.id : null); setSelectedBedIds([]); setRoomRemovalMode(false); setSelectedRoomIds([]); }} className="rounded-[10px] border border-[#d98d79] bg-white px-3 py-2 text-sm font-semibold text-[#b9573b] hover:bg-[#fff7f4] disabled:opacity-50">{bedRemovalRoomId === room.id ? "Cancel Bed Removal" : "Remove Bed"}</button>
                        </div>
                      </div>

                      {editingRoomId === room.id ? (
                        <div className="mt-4 rounded-[1rem] border border-[var(--color-dormmate-border)] bg-white p-4">
                          <RoomForm unit={unit} existingRoom={room} compact onCancel={() => setEditingRoomId(null)} onSuccess={() => setEditingRoomId(null)} />
                        </div>
                      ) : null}

                      {bedRemovalRoomId === room.id ? <div className="mt-3 flex flex-wrap items-center justify-end gap-3"><span className="text-xs text-[var(--color-dormmate-muted)]">{selectedBedIds.length} bed{selectedBedIds.length === 1 ? "" : "s"} selected</span><button type="button" disabled={removing || selectedBedIds.length === 0} onClick={() => setRemovalRequest({ roomIds: [], bedIds: selectedBedIds, label: "selected bed spaces" })} className="rounded-[10px] bg-[#c65f43] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Remove Selected Beds</button></div> : null}

                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {roomBedSpaces.map((bedSpace) => (
                          <div key={bedSpace.id} className="rounded-[1rem] border border-[var(--color-dormmate-border)] bg-white p-3.5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                {bedRemovalRoomId === room.id ? <input type="checkbox" aria-label={`Select ${bedSpace.bed_label}`} disabled={unit.occupied_bed_space_ids.includes(bedSpace.id)} title={unit.occupied_bed_space_ids.includes(bedSpace.id) ? "Move out the currently assigned tenant before removing this bed space." : undefined} checked={selectedBedIds.includes(bedSpace.id)} onChange={() => toggleSelection(bedSpace.id, "bed")} className="mt-1 h-4 w-4 accent-[#c65f43] disabled:cursor-not-allowed disabled:opacity-40" /> : null}
                                <div>
                                <p className="font-semibold">{bedSpace.bed_label}</p>
                                <p className="text-sm text-[var(--color-dormmate-muted)]">
                                  {bedSpace.rental_rate !== null ? `₱${bedSpace.rental_rate}` : "No rate set"}
                                </p>
                                {unit.bed_space_occupants[bedSpace.id] ? <div className="mt-2 flex items-center gap-2"><ProfileAvatar photoUrl={unit.bed_space_occupants[bedSpace.id].profile_photo_url} name={unit.bed_space_occupants[bedSpace.id].name} assignmentLabel={`${unit.unit_name} • Room: ${room.room_number} • ${bedSpace.bed_label}`} className="h-7 w-7" /><span className="text-xs font-semibold text-[#1b263b]">{unit.bed_space_occupants[bedSpace.id].name}</span></div> : null}
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${unit.occupied_bed_space_ids.includes(bedSpace.id) ? "bg-[#fff2df] text-[#b87417]" : bedSpace.status === "available" ? "bg-[var(--color-dormmate-primary)] text-white" : "bg-[#f5f6f4] text-[#415a77]"}`}>
                                  {unit.occupied_bed_space_ids.includes(bedSpace.id) ? "occupied" : bedSpace.status}
                                </span>
                                <button type="button" aria-expanded={editingBedSpaceId === bedSpace.id} onClick={() => setEditingBedSpaceId((current) => current === bedSpace.id ? null : bedSpace.id)} className="rounded-[10px] border border-[var(--color-dormmate-primary)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-dormmate-primary)] transition hover:bg-[var(--color-dormmate-surface)]">{editingBedSpaceId === bedSpace.id ? "Cancel" : "Edit"}</button>
                              </div>
                            </div>
                            {editingBedSpaceId === bedSpace.id ? (
                              <div className="mt-4 border-t border-[var(--color-dormmate-border)] pt-4">
                                <BedSpaceForm unit={unit} roomId={room.id} existingBedSpace={bedSpace} onCancel={() => setEditingBedSpaceId(null)} onSuccess={() => setEditingBedSpaceId(null)} />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ) : unit.unit_category === "room_space" ? (
          <section className="rounded-[1.35rem] border border-[var(--color-dormmate-border)] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Rooms</p>
              {roomRemovalMode ? <div className="flex items-center gap-3"><span className="text-xs text-[var(--color-dormmate-muted)]">{selectedRoomIds.length} selected</span><button type="button" disabled={removing || selectedRoomIds.length === 0} onClick={() => setRemovalRequest({ roomIds: selectedRoomIds, bedIds: [], label: "selected rooms" })} className="rounded-[10px] bg-[#c65f43] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Remove Selected Rooms</button></div> : null}
            </div>
            <label className="mt-4 block">
              <span className="sr-only">Search by room name</span>
              <input type="search" value={roomQuery} onChange={(event) => setRoomQuery(event.target.value)} placeholder="Search by Room Name" autoComplete="off" className="w-full rounded-[14px] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-dormmate-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]" />
            </label>
            <div className="mt-5 space-y-3">
              {visibleRooms.length === 0 ? (
                <p className="text-sm text-[var(--color-dormmate-muted)]">{unit.rooms.length === 0 ? "No rooms have been added yet." : "No rooms match your search."}</p>
              ) : (
                visibleRooms.map((room) => {
                  const occupancyStatus = room.status === "inactive"
                    ? "Inactive"
                    : unit.occupied_room_ids.includes(room.id) ? "Occupied" : "Available";

                  return (
                  <div key={room.id} className="rounded-[1.15rem] border border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {roomRemovalMode ? <input type="checkbox" aria-label={`Select room ${room.room_number}`} disabled={unit.occupied_room_ids.includes(room.id)} title={unit.occupied_room_ids.includes(room.id) ? "Move out the currently assigned tenant before removing this room." : undefined} checked={selectedRoomIds.includes(room.id)} onChange={() => toggleSelection(room.id, "room")} className="mt-1 h-4 w-4 accent-[#c65f43] disabled:cursor-not-allowed disabled:opacity-40" /> : null}
                        <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-dormmate-muted)]">Room Name</p><h4 className="text-base font-semibold">{room.room_number}</h4>
                        <p className="text-sm text-[var(--color-dormmate-muted)]">
                          Status: {room.status} {room.rental_rate !== null ? `• Rate: ₱${room.rental_rate}` : ""}
                        </p>
                        {unit.room_occupants[room.id] ? <div className="mt-2 flex items-center gap-2"><ProfileAvatar photoUrl={unit.room_occupants[room.id].profile_photo_url} name={unit.room_occupants[room.id].name} assignmentLabel={`${unit.unit_name} • Room: ${room.room_number}`} className="h-7 w-7" /><span className="text-xs font-semibold text-[#1b263b]">{unit.room_occupants[room.id].name}</span></div> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${occupancyStatus === "Occupied" ? "bg-[#fff2df] text-[#b87417]" : occupancyStatus === "Available" ? "bg-[var(--color-dormmate-primary)] text-white" : "bg-[#f5f6f4] text-[#415a77]"}`}>
                          {occupancyStatus}
                        </span>
                        <button
                          type="button"
                          aria-expanded={editingRoomId === room.id}
                          onClick={() => setEditingRoomId((current) => current === room.id ? null : room.id)}
                          className="rounded-[10px] border border-[var(--color-dormmate-primary)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-dormmate-primary)] transition hover:bg-[var(--color-dormmate-surface)]"
                        >
                          {editingRoomId === room.id ? "Cancel" : "Edit"}
                        </button>
                      </div>
                    </div>
                    {editingRoomId === room.id ? (
                      <div className="mt-4 border-t border-[var(--color-dormmate-border)] pt-4">
                        <RoomForm unit={unit} existingRoom={room} compact onCancel={() => setEditingRoomId(null)} onSuccess={() => setEditingRoomId(null)} />
                      </div>
                    ) : null}
                  </div>
                  );
                })
              )}
            </div>
          </section>
        ) : null}
      </div>

      <FormModal open={editingUnit} onClose={() => setEditingUnit(false)} title="Edit Unit" description={`Update ${unit.unit_name}.`}>
        <UnitEditForm unit={unit} onCancel={() => setEditingUnit(false)} onSuccess={() => setEditingUnit(false)} />
      </FormModal>

      <FormModal open={addingRoom} onClose={() => setAddingRoom(false)} title={unit.unit_category === "bed_space" ? "Add Room and Bed Spaces" : "Add Room"} description={`Create a room inside ${unit.unit_name}.`}>
        <RoomForm unit={unit} compact onCancel={() => setAddingRoom(false)} onSuccess={() => setAddingRoom(false)} />
      </FormModal>

      <FormModal open={addingBedToRoomId !== null} onClose={() => setAddingBedToRoomId(null)} title="Add Bed Space" description="Create another bed space inside this room.">
        {addingBedToRoomId ? <BedSpaceForm unit={unit} roomId={addingBedToRoomId} onCancel={() => setAddingBedToRoomId(null)} onSuccess={() => setAddingBedToRoomId(null)} /> : null}
      </FormModal>

      <ConfirmationModal open={removalRequest !== null} title={`Remove ${removalRequest?.label ?? "selected records"}?`} description="A room or bed space cannot be removed while a tenant is currently assigned." confirmLabel="Confirm Removal" tone="danger" pending={removing} onCancel={() => setRemovalRequest(null)} onConfirm={confirmRemoval} />
      <FormModal open={Boolean(removalMessage && !removalMessage.success)} title="Unable to remove selected space" description={removalMessage?.text} onClose={() => setRemovalMessage(null)}>
        <button type="button" onClick={() => setRemovalMessage(null)} className="w-full rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white">Okay</button>
      </FormModal>
    </div>
  );
}