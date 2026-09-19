import type { LandlordPaymentItem } from "@/lib/landlord/data";
import type { UnitListItem } from "@/lib/units/types";

type MonthlyCollectionsCardProps = {
  payments: LandlordPaymentItem[];
};

type OccupancyCardProps = {
  units: UnitListItem[];
  overallRate: number;
};

type OccupancyState = {
  label: "Occupied" | "Available" | "Inactive";
  count: number;
  color: string;
};

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 1,
});

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getPaymentMonthKey(paymentDate: string) {
  const [year, month] = paymentDate.split("-").map(Number);
  return Number.isFinite(year) && Number.isFinite(month) ? getMonthKey(year, month - 1) : "";
}

function getMonthlyCollections(payments: LandlordPaymentItem[]) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(currentYear, currentMonth - (5 - index), 1);
    return {
      key: getMonthKey(date.getFullYear(), date.getMonth()),
      label: new Intl.DateTimeFormat("en-PH", { month: "short" }).format(date),
      year: date.getFullYear(),
      amount: 0,
      isCurrent: date.getFullYear() === currentYear && date.getMonth() === currentMonth,
    };
  });

  const monthMap = new Map(months.map((month) => [month.key, month]));

  for (const payment of payments) {
    if (payment.verificationStatus !== "verified") continue;
    const month = monthMap.get(getPaymentMonthKey(payment.paymentDate));
    if (month) month.amount += payment.amount;
  }

  return months;
}

function getOccupancyStates(units: UnitListItem[]): OccupancyState[] {
  const totals = units.reduce(
    (result, unit) => {
      if (unit.unit_category === "apartment") {
        if (unit.status === "inactive") result.inactive += 1;
        else if (unit.apartment_is_occupied) result.occupied += 1;
        else result.available += 1;
        return result;
      }

      if (unit.unit_category === "room_space") {
        for (const room of unit.rooms) {
          if (unit.status === "inactive" || room.status === "inactive") result.inactive += 1;
          else if (unit.occupied_room_ids.includes(room.id)) result.occupied += 1;
          else result.available += 1;
        }
        return result;
      }

      for (const bed of unit.bed_spaces) {
        const room = unit.rooms.find((item) => item.id === bed.room_id);
        if (unit.status === "inactive" || room?.status === "inactive" || bed.status === "inactive") result.inactive += 1;
        else if (unit.occupied_bed_space_ids.includes(bed.id)) result.occupied += 1;
        else result.available += 1;
      }

      return result;
    },
    { occupied: 0, available: 0, inactive: 0 },
  );

  return [
    { label: "Occupied", count: totals.occupied, color: "#315a57" },
    { label: "Available", count: totals.available, color: "#91aaa6" },
    { label: "Inactive", count: totals.inactive, color: "#d6a91f" },
  ];
}

export function MonthlyCollectionsCard({ payments }: MonthlyCollectionsCardProps) {
  const monthlyCollections = getMonthlyCollections(payments);
  const maximumCollection = Math.max(...monthlyCollections.map((month) => month.amount), 0);
  const collectionTotal = monthlyCollections.reduce((sum, month) => sum + month.amount, 0);
  const periodStart = monthlyCollections[0];
  const periodEnd = monthlyCollections.at(-1) ?? periodStart;
  const periodLabel = periodStart.year === periodEnd.year
    ? `${periodStart.label}–${periodEnd.label} ${periodEnd.year}`
    : `${periodStart.label} ${periodStart.year}–${periodEnd.label} ${periodEnd.year}`;

  return (
      <article className="surface-elevated h-full rounded-[1.35rem] bg-white p-4 sm:p-5" aria-labelledby="monthly-collections-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Rent performance</p>
            <h2 id="monthly-collections-title" className="mt-1.5 text-xl font-bold text-[var(--color-dormmate-text-strong)]">Monthly collections</h2>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-[var(--color-dormmate-muted)]">{periodLabel}</p>
            <p className="mt-1 text-sm font-bold text-[var(--color-dormmate-text-strong)]">{currencyFormatter.format(collectionTotal)}</p>
          </div>
        </div>

        <div className="mt-6 flex h-56 items-end gap-2 border-b border-[var(--color-dormmate-border)] px-1 sm:gap-4 sm:px-3" aria-label={`Verified monthly collections from ${periodLabel}`}>
          {monthlyCollections.map((month) => {
            const height = maximumCollection > 0 ? Math.max((month.amount / maximumCollection) * 100, month.amount > 0 ? 8 : 2) : 2;
            return (
              <div key={month.key} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <div className="group relative flex flex-1 items-end justify-center">
                  <span
                    className="pointer-events-none absolute left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#253d3b] px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block group-focus-within:block"
                    style={{ bottom: `calc(${height}% + 0.5rem)` }}
                  >
                    {currencyFormatter.format(month.amount)}
                  </span>
                  <div
                    tabIndex={0}
                    className={`w-full max-w-14 rounded-t-[0.7rem] transition-[height,filter] duration-300 hover:brightness-95 focus-visible:brightness-95 focus-visible:outline-none ${month.isCurrent ? "bg-[var(--color-dormmate-accent)]" : "bg-[#7f9995]"}`}
                    style={{ height: `${height}%` }}
                    aria-label={`${month.label} ${month.year}: ${currencyFormatter.format(month.amount)}`}
                  />
                </div>
                <span className={`mt-2 text-center text-[11px] font-semibold sm:text-xs ${month.isCurrent ? "text-[#9b7210]" : "text-[var(--color-dormmate-muted)]"}`}>{month.label}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--color-dormmate-muted)]">
          <span>Verified payments only</span>
          <span>Peak {compactCurrencyFormatter.format(maximumCollection)}</span>
        </div>
      </article>
  );
}

export function OccupancyCard({ units, overallRate }: OccupancyCardProps) {
  const occupancyStates = getOccupancyStates(units);
  const totalSpaces = occupancyStates.reduce((sum, state) => sum + state.count, 0);
  const spaceCategories = [
    {
      label: "Bed Space",
      count: units
        .filter((unit) => unit.unit_category === "bed_space")
        .reduce((sum, unit) => sum + unit.bed_spaces.length, 0),
    },
    {
      label: "Room Space",
      count: units
        .filter((unit) => unit.unit_category === "room_space")
        .reduce((sum, unit) => sum + unit.rooms.length, 0),
    },
    { label: "Apartment", count: units.filter((unit) => unit.unit_category === "apartment").length },
  ];

  let cumulativePercentage = 0;
  const occupancyGradient = totalSpaces === 0
    ? "#d9e4e1 0 100%"
    : occupancyStates.map((state) => {
        const start = cumulativePercentage;
        cumulativePercentage += (state.count / totalSpaces) * 100;
        return `${state.color} ${start}% ${cumulativePercentage}%`;
      }).join(", ");

  return (
      <article className="surface-elevated h-full rounded-[1.35rem] bg-[#e7f0ee] p-4 sm:p-5" aria-labelledby="occupancy-title">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Space status</p>
          <h2 id="occupancy-title" className="mt-1.5 text-xl font-bold text-[var(--color-dormmate-text-strong)]">Occupancy</h2>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Rental spaces by category">
          {spaceCategories.map((category) => (
            <div key={category.label} className="rounded-xl bg-white/70 px-2 py-3 text-center">
              <strong className="block text-lg text-[var(--color-dormmate-text-strong)]">{category.count}</strong>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-dormmate-muted)]">{category.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
          <div
            className="mx-auto grid h-[150px] w-[150px] place-items-center rounded-full shadow-[inset_0_0_0_1px_rgba(49,90,87,0.05)]"
            style={{ background: `conic-gradient(${occupancyGradient})` }}
            role="img"
            aria-label={`Occupancy is ${overallRate} percent. ${occupancyStates.map((state) => `${state.count} ${state.label.toLowerCase()}`).join(", ")}.`}
          >
            <div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-[#f7faf8] text-center shadow-[0_0_0_1px_rgba(49,90,87,0.05)]">
              <div>
                <strong className="block text-2xl text-[var(--color-dormmate-text-strong)]">{overallRate}%</strong>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-dormmate-muted)]">occupied</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {occupancyStates.map((state) => (
              <div key={state.label} className="flex items-center justify-between gap-3 rounded-xl bg-white/65 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-dormmate-text)]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: state.color }} />
                  {state.label}
                </span>
                <strong className="text-sm text-[var(--color-dormmate-text-strong)]">{state.count}</strong>
              </div>
            ))}
            <p className="pt-1 text-xs font-medium text-[var(--color-dormmate-muted)]">{totalSpaces} configured rental space{totalSpaces === 1 ? "" : "s"}</p>
          </div>
        </div>
      </article>
  );
}