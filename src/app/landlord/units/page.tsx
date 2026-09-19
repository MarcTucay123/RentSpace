import Link from "next/link";

import { UnitsList } from "@/components/units/units-list";
import { FilterNavigation } from "@/components/ui/filter-navigation";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { requireLandlordAccess } from "@/lib/auth/utils";
import { getUnitsWithStructure } from "@/lib/units/data";

export const metadata = {
  title: "Units | RentSpace",
};

type UnitsPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LandlordUnitsPage({ searchParams }: UnitsPageProps) {
  await requireLandlordAccess();
  const [units, params] = await Promise.all([getUnitsWithStructure(), searchParams]);
  const requestedFilter = typeof params.filter === "string" ? params.filter : "all";
  const removalMode = params.mode === "remove";
  const selectedFilter = ["all", "bed_space", "room_space", "apartment"].includes(requestedFilter) ? requestedFilter : "all";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const normalizedQuery = query.toLocaleLowerCase();
  const filteredUnits = units.filter((unit) => {
    const matchesFilter = selectedFilter === "all" || unit.unit_category === selectedFilter;
    return matchesFilter && (!normalizedQuery || unit.unit_name.toLocaleLowerCase().includes(normalizedQuery));
  });
  const searchSuggestions = Array.from(new Set(units.map((unit) => unit.unit_name)));
  const bedSpaceCount = units.filter((unit) => unit.unit_category === "bed_space").length;
  const roomSpaceCount = units.filter((unit) => unit.unit_category === "room_space").length;
  const apartmentCount = units.filter((unit) => unit.unit_category === "apartment").length;

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] border border-[var(--color-dormmate-border)] bg-white p-4 shadow-sm sm:flex sm:items-end sm:justify-between sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">
            Units Management
          </p>
          <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">Manage rental structures</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-dormmate-muted)]">
            Create and manage Bed Space Units, Room Space Units, and Apartment Units for RentSpace.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
          <Link href="/landlord/units/new" className="inline-flex rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">+ Add Unit</Link>
          <Link href={removalMode ? `/landlord/units${query ? `?q=${encodeURIComponent(query)}` : ""}` : `/landlord/units?mode=remove${selectedFilter !== "all" ? `&filter=${selectedFilter}` : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`} className="inline-flex rounded-[14px] border border-[#d45f43] bg-white px-4 py-2.5 text-sm font-semibold text-[#b9472f] shadow-sm transition hover:bg-[#fff1ed]">{removalMode ? "Cancel Removal" : "Remove Unit"}</Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
        {[
          { label: "Bed Space Units", value: bedSpaceCount, tone: "bg-[#f0f1ee] text-[#1b263b]" },
          { label: "Room Space Units", value: roomSpaceCount, tone: "bg-[#e0e1dd] text-[#415a77]" },
          { label: "Apartment Units", value: apartmentCount, tone: "bg-[#fff8e7] text-[#c08a26]" },
        ].map((stat) => (
          <article key={stat.label} className="min-w-0 rounded-[1rem] bg-white p-3 shadow-[var(--shadow)] sm:rounded-[1.15rem] sm:p-4">
            <p className="truncate text-xs text-[var(--color-dormmate-muted)] sm:text-sm">{stat.label}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2 sm:mt-2"><p className="text-xl font-semibold text-[var(--color-dormmate-text-strong)] sm:text-[1.6rem]">{stat.value}</p><span className={`truncate rounded-full px-2 py-1 text-[10px] font-semibold sm:px-2.5 sm:text-xs ${stat.tone}`}>{stat.label}</span></div>
          </article>
        ))}
      </section>

      <section className="rounded-[1.15rem] bg-white p-4 shadow-[var(--shadow)]">
        <ListSearchForm basePath="/landlord/units" query={query} selectedFilter={selectedFilter} preservedParams={removalMode ? { mode: "remove" } : {}} label="Search units" placeholder="Search Unit Name" suggestions={searchSuggestions} />
        <div className="mt-4">
        <FilterNavigation
          basePath="/landlord/units"
          selected={selectedFilter}
          preservedParams={{ ...(removalMode ? { mode: "remove" } : {}), ...(query ? { q: query } : {}) }}
          label="Filter Units"
          options={[
            { value: "all", label: "All", count: units.length },
            { value: "bed_space", label: "Bed Space Unit", count: bedSpaceCount },
            { value: "room_space", label: "Room Space Unit", count: roomSpaceCount },
            { value: "apartment", label: "Apartment Unit", count: apartmentCount },
          ]}
        />
        </div>
      </section>

      <UnitsList units={filteredUnits} removalMode={removalMode} emptyMessage={`No ${selectedFilter === "all" ? "Units" : selectedFilter.replace("_", " ") + " Units"} found.`} />
    </div>
  );
}