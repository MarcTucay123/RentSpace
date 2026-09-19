"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { removeUnusedUnits } from "@/app/actions/units";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { getUnitCategoryLabel, type UnitListItem } from "@/lib/units/types";

type UnitsListProps = {
  units: UnitListItem[];
  emptyMessage?: string;
  removalMode?: boolean;
};

function getSummary(unit: UnitListItem) {
  if (unit.unit_category === "bed_space") {
    const totalBedSpaces = unit.bed_spaces.length;
    const availableBedSpaces = unit.bed_spaces.filter((bedSpace) => bedSpace.status === "available").length;

    return [
      `Rooms: ${unit.rooms.length}`,
      `Occupied Bed Spaces: ${unit.occupied_bed_space_count}`,
      `Available Bed Spaces: ${availableBedSpaces}`,
      `Total Bed Spaces: ${totalBedSpaces}`,
    ];
  }

  if (unit.unit_category === "room_space") {
    const activeRooms = unit.rooms.filter((room) => room.status === "active").length;
    const availableRooms = Math.max(activeRooms - unit.occupied_room_count, 0);

    return [
      `Rooms: ${unit.rooms.length}`,
      `Occupied Rooms: ${unit.occupied_room_count}`,
      `Available Rooms: ${availableRooms}`,
    ];
  }

  return [unit.apartment_is_occupied ? "Occupied" : "Available", `Rate: ${unit.rental_rate === null ? "Not set" : `₱${unit.rental_rate.toLocaleString()}`}`, `Status: ${unit.status}`];
}

function getCategoryTone(category: UnitListItem["unit_category"]) {
  if (category === "bed_space") return "bg-[#f0f1ee] text-[#2f7d3b]";
  if (category === "room_space") return "bg-[#e0e1dd] text-[#415a77]";
  return "bg-[#fff8e7] text-[#b77916]";
}

export function UnitsList({ units, emptyMessage, removalMode = false }: UnitsListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (units.length === 0) {
    return (
      <div className="rounded-[1.35rem] border border-dashed border-[var(--color-dormmate-border)] bg-white p-6 text-sm text-[var(--color-dormmate-muted)] shadow-sm">
        {emptyMessage ?? "No units have been created yet. Add your first RentSpace unit to begin structuring rooms and bed spaces."}
      </div>
    );
  }

  const allVisibleSelected = units.every((unit) => selectedIds.includes(unit.id));

  function toggleUnit(unitId: string) {
    setMessage(null);
    setSelectedIds((current) => current.includes(unitId) ? current.filter((id) => id !== unitId) : [...current, unitId]);
  }

  function removeSelected() {
    setConfirmationOpen(false);
    startTransition(async () => {
      const result = await removeUnusedUnits(selectedIds);
      setMessage({ success: Boolean(result.success), text: result.message ?? "Unit removal completed." });
      if (result.success) {
        setSelectedIds([]);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      {removalMode ? (
        <section className="flex flex-col gap-3 rounded-[1.15rem] border border-[#edc3b7] bg-[#fffaf8] p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-dormmate-text-strong)]">
            <input type="checkbox" checked={allVisibleSelected} onChange={() => setSelectedIds(allVisibleSelected ? [] : units.map((unit) => unit.id))} className="h-4 w-4 accent-[var(--color-dormmate-primary)]" />
            Select all visible units
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[var(--color-dormmate-muted)]">{selectedIds.length} selected</span>
            <button type="button" disabled={selectedIds.length === 0 || pending} onClick={() => setConfirmationOpen(true)} className="rounded-[12px] bg-[#c65f43] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Removing..." : "Remove Selected"}</button>
          </div>
        </section>
      ) : null}

      {message ? <div className={`rounded-[1rem] px-4 py-3 text-sm ${message.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</div> : null}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {units.map((unit) => (
        <article
          key={unit.id}
          className={`relative min-w-0 rounded-[1rem] border bg-white p-3 shadow-sm transition sm:rounded-[1.35rem] sm:p-4 ${selectedIds.includes(unit.id) ? "border-[#c65f43] ring-2 ring-[#f4d8d1]" : "border-[var(--color-dormmate-border)]"}`}
        >
          {removalMode ? (
            <label className="absolute right-4 top-4 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-[var(--color-dormmate-border)] bg-white shadow-sm" aria-label={`Select ${unit.unit_name} for removal`}>
              <input type="checkbox" name="selectedUnit" value={unit.id} checked={selectedIds.includes(unit.id)} onChange={() => toggleUnit(unit.id)} className="h-4 w-4 accent-[#c65f43]" />
            </label>
          ) : null}
          <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
            <div className={`min-w-0 ${removalMode ? "pr-9 sm:pr-11" : ""}`}>
              <h3 className="truncate text-sm font-semibold sm:text-lg">{unit.unit_name}</h3>
              <p className={`mt-1.5 inline-flex max-w-full truncate rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] sm:mt-2 sm:px-3 sm:text-[11px] sm:tracking-[0.18em] ${getCategoryTone(unit.unit_category)}`}>
                {getUnitCategoryLabel(unit.unit_category)}
              </p>
            </div>
            {!removalMode ? <span className="rounded-full border border-[var(--color-dormmate-border)] px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-dormmate-muted)] sm:px-3 sm:text-xs">
              {unit.status}
            </span> : null}
          </div>

          {unit.description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--color-dormmate-muted)] sm:mt-3 sm:text-sm sm:leading-6">{unit.description}</p>
          ) : null}

          <div className="mt-3 space-y-1 text-[11px] text-[var(--color-dormmate-muted)] sm:mt-4 sm:space-y-1.5 sm:text-sm">
            {getSummary(unit).map((line) => (
              <p key={line} className="truncate">{line}</p>
            ))}
          </div>

          {!removalMode ? <Link
            href={`/landlord/units/${unit.id}`}
            className="mt-3 inline-flex rounded-[10px] bg-[var(--color-dormmate-primary)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 sm:mt-5 sm:rounded-[14px] sm:px-4 sm:py-2.5 sm:text-sm"
          >
            Manage
          </Link> : <button type="button" onClick={() => toggleUnit(unit.id)} className="mt-3 text-xs font-semibold text-[#b9573b] sm:mt-5 sm:text-sm">{selectedIds.includes(unit.id) ? "Selected for removal" : "Select this unit"}</button>}
        </article>
        ))}
      </div>

      <ConfirmationModal open={confirmationOpen} title="Permanently remove selected units?" description={`You selected ${selectedIds.length} unit${selectedIds.length === 1 ? "" : "s"}. Units with tenant assignment or maintenance history will be protected and kept. Unused rooms and bed spaces inside eligible units will also be removed.`} confirmLabel="Remove Units" tone="danger" pending={pending} onCancel={() => setConfirmationOpen(false)} onConfirm={removeSelected} />
    </div>
  );
}