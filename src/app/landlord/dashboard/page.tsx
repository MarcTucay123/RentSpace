import Link from "next/link";
import { MonthlyCollectionsCard, OccupancyCard } from "@/components/landlord/occupancy-analytics";
import { getDisplayName, requireLandlordAccess } from "@/lib/auth/utils";
import {
getLandlordMaintenanceRequests,
getLandlordNotifications,
getLandlordPayments,
getLandlordRentMonitoring,
getLandlordTenants,
getPendingTenantRegistrationCount,
} from "@/lib/landlord/data";
import { getUnitsWithStructure } from "@/lib/units/data";
export const metadata = { title: "Landlord Dashboard | RentSpace" };
const currencyFormatter = new Intl.NumberFormat("en-PH", {
style: "currency",
currency: "PHP",
maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
month: "short",
day: "numeric",
year: "numeric",
});
function formatLocation(item: { unitName: string | null; roomNumber: string | null; bedLabel: string | null }) {
const parts = [item.unitName, item.roomNumber ? `Room: ${item.roomNumber}` : null, item.bedLabel].filter(Boolean);
return parts.length > 0 ? parts.join(" · ") : "Location not set";
}
function statusLabel(status: string) {
return status.replaceAll("_", " ");
}
export default async function LandlordDashboardPage() {
const { profile } = await requireLandlordAccess();
const [tenants, payments, maintenance, obligations, notifications, units, pendingRegistrations] = await Promise.all([
getLandlordTenants(),
getLandlordPayments(),
getLandlordMaintenanceRequests(),
getLandlordRentMonitoring(),
getLandlordNotifications(),
getUnitsWithStructure(),
getPendingTenantRegistrationCount(),
]);
const activeUnits = units.filter((unit) => unit.status === "active");
const spaceTotals = activeUnits.reduce(
(totals, unit) => {
if (unit.unit_category === "apartment") {
totals.capacity += 1;
totals.occupied += unit.apartment_is_occupied ? 1 : 0;
} else if (unit.unit_category === "room_space") {
totals.capacity += unit.rooms.filter((room) => room.status === "active").length;
totals.occupied += unit.occupied_room_count;
} else {
totals.capacity += unit.bed_spaces.filter((bed) => bed.status !== "inactive").length;
totals.occupied += unit.occupied_bed_space_count;
}
return totals;
},
{ capacity: 0, occupied: 0 },
);
const occupiedSpaces = Math.min(spaceTotals.occupied, spaceTotals.capacity);
const occupancyRate = spaceTotals.capacity > 0 ? Math.round((occupiedSpaces / spaceTotals.capacity) * 100) : 0;
const totalDue = obligations.reduce((sum, item) => sum + item.amountDue, 0);
const totalPaid = obligations.reduce((sum, item) => sum + item.amountPaid, 0);
const collectionRate = totalDue > 0 ? Math.min(Math.round((totalPaid / totalDue) * 100), 100) : 0;
const overdueObligations = obligations.filter((item) => item.dueStatus === "overdue" && item.paymentStatus !== "paid" && item.balance > 0);
const outstandingBalance = overdueObligations.reduce((sum, item) => sum + item.balance, 0);
const pendingPayments = payments.filter((item) => item.verificationStatus === "pending");
const openMaintenance = maintenance.filter((item) => item.status !== "resolved");
const unreadNotifications = notifications.filter((item) => !item.isRead).length;
const attentionItems = [
{
label: "Tenant registrations",
detail: `${pendingRegistrations} awaiting review`,
count: pendingRegistrations,
href: "/landlord/approvals",
tone: "bg-[#fff8e7] text-[#a66f12]",
},
{
label: "Payment submissions",
detail: `${pendingPayments.length} awaiting verification`,
count: pendingPayments.length,
href: "/landlord/payments",
tone: "bg-[#e0e1dd] text-[#415a77]",
},
{
label: "Overdue rent",
detail: `${overdueObligations.length} obligation${overdueObligations.length === 1 ? "" : "s"} overdue`,
count: overdueObligations.length,
href: "/landlord/rent-monitoring",
tone: "bg-[#fbe9e5] text-[#b9573b]",
},
{
label: "Maintenance requests",
detail: `${openMaintenance.length} still open`,
count: openMaintenance.length,
href: "/landlord/maintenance",
tone: "bg-[#f0f1ee] text-[#1b263b]",
},
];
return (
<div className="space-y-5 pb-4">
<section className="portal-hero overflow-hidden rounded-[1.5rem] text-white">
<div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
<div>
<p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#778da9]">Landlord overview</p>
<h1 className="mt-2 text-[1.75rem] font-bold tracking-[-0.025em] sm:text-[2rem]">
Good day, {getDisplayName(profile)}
</h1>
<p className="mt-2 max-w-2xl text-sm leading-6 text-[#e0e1dd]">
Here is the latest view of your tenants, collections, occupancy, and requests that need attention.
</p>
</div>
<div className="flex flex-wrap gap-2 xl:justify-end">
<Link href="/landlord/units/new" className="rounded-full bg-[#f2b94b] px-4 py-2.5 text-sm font-bold text-[#0d1b2a] transition hover:bg-[#ffc961]">
+ Add unit
</Link>
<Link href="/landlord/reports" className="rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">
View reports
</Link>
</div>
</div>
</section>
<section aria-label="Portfolio statistics" className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
{[
{ label: "Active tenants", value: tenants.length, helper: `${activeUnits.length} active unit${activeUnits.length === 1 ? "" : "s"}`, accent: "bg-[#f0f1ee] text-[#1b263b]", mark: "T" },
{ label: "Occupancy", value: `${occupancyRate}%`, helper: `${occupiedSpaces} of ${spaceTotals.capacity} spaces`, accent: "bg-[#e0e1dd] text-[#415a77]", mark: "%" },
{ label: "Outstanding rent", value: currencyFormatter.format(outstandingBalance), helper: `${overdueObligations.length} overdue only`, accent: "bg-[#fff3dc] text-[#a66f12]", mark: "₱" },
{ label: "Open maintenance", value: openMaintenance.length, helper: `${maintenance.filter((item) => item.status === "in_progress").length} in progress`, accent: "bg-[#f3e9e4] text-[#a85c43]", mark: "M" },
].map((stat) => (
<article key={stat.label} className="interactive-card surface-elevated min-w-0 rounded-[1rem] bg-white/90 p-3 sm:rounded-[1.25rem] sm:p-5">
<div className="flex items-start justify-between gap-1.5 sm:gap-3">
<div className="min-w-0">
<p className="text-xs font-medium leading-4 text-[var(--color-dormmate-muted)] sm:text-sm">{stat.label}</p>
<p className="mt-1.5 truncate text-[1.3rem] font-bold tracking-tight text-[var(--color-dormmate-text-strong)] sm:mt-2 sm:text-[1.65rem]">{stat.value}</p>
</div>
<span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-xs font-black sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm ${stat.accent}`}>{stat.mark}</span>
</div>
<p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#415a77] sm:mt-3 sm:text-xs sm:tracking-[0.12em]">{stat.helper}</p>
</article>
))}
</section>
<section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]" aria-label="Rent performance">
<MonthlyCollectionsCard payments={payments} />
<article className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
<div className="flex flex-wrap items-start justify-between gap-3">
<div>
<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Rent performance</p>
<h2 className="mt-1.5 text-xl font-bold text-[var(--color-dormmate-text-strong)]">Collection overview</h2>
</div>
<Link href="/landlord/rent-monitoring" className="text-sm font-semibold text-[var(--color-dormmate-primary)] hover:underline">Open rent ledger →</Link>
</div>
<div className="mt-5 grid gap-5 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center">
<div className="mx-auto grid h-[126px] w-[126px] place-items-center rounded-full" style={{ background: `conic-gradient(#1b263b ${collectionRate}%, #e0e1dd 0)` }}>
<div className="grid h-[96px] w-[96px] place-items-center rounded-full bg-white text-center">
<div><strong className="block text-2xl text-[#0d1b2a]">{collectionRate}%</strong><span className="text-[11px] font-semibold uppercase tracking-wider text-[#415a77]">collected</span></div>
</div>
</div>
<div className="space-y-3">
<div className="flex items-center justify-between gap-3 border-b border-[var(--color-dormmate-border)] pb-3 text-sm">
<span className="text-[var(--color-dormmate-muted)]">Total billed</span><strong className="text-[#0d1b2a]">{currencyFormatter.format(totalDue)}</strong>
</div>
<div className="flex items-center justify-between gap-3 border-b border-[var(--color-dormmate-border)] pb-3 text-sm">
<span className="text-[var(--color-dormmate-muted)]">Payments collected</span><strong className="text-[#1b263b]">{currencyFormatter.format(totalPaid)}</strong>
</div>
<div className="flex items-center justify-between gap-3 text-sm">
<span className="text-[var(--color-dormmate-muted)]">Pending verification</span><strong className="text-[#a66f12]">{pendingPayments.length}</strong>
</div>
</div>
</div>
</article>
</section>
<section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]" aria-label="Occupancy and action center">
<OccupancyCard units={units} overallRate={occupancyRate} />
<article className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
<div className="flex items-start justify-between gap-3">
<div>
<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Action center</p>
<h2 className="mt-1.5 text-xl font-bold text-[var(--color-dormmate-text-strong)]">Needs your attention</h2>
</div>
{unreadNotifications > 0 ? <span className="rounded-full bg-[#fbe9e5] px-2.5 py-1 text-xs font-bold text-[#b9573b]">{unreadNotifications} unread</span> : null}
</div>
<div className="mt-4 space-y-2.5">
{attentionItems.map((item) => (
<Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-[1rem] border border-[var(--color-dormmate-border)] p-3 transition hover:bg-[#f5f6f4]">
<span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${item.tone}`}>{item.count}</span>
<span className="min-w-0 flex-1"><strong className="block text-sm text-[#0d1b2a]">{item.label}</strong><span className="block truncate text-xs text-[var(--color-dormmate-muted)]">{item.detail}</span></span>
<span aria-hidden="true" className="text-[#415a77]">→</span>
</Link>
))}
</div>
</article>
</section>
<section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
<div className="flex flex-wrap items-end justify-between gap-3">
<div>
<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Operations</p>
<h2 className="mt-1.5 text-xl font-bold text-[var(--color-dormmate-text-strong)]">Recent maintenance requests</h2>
</div>
<Link href="/landlord/maintenance" className="text-sm font-semibold text-[var(--color-dormmate-primary)] hover:underline">View all requests →</Link>
</div>
{maintenance.length === 0 ? (
<div className="mt-4 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] p-5 text-center text-sm text-[var(--color-dormmate-muted)]">
No maintenance requests have been submitted yet.
</div>
) : (
<div className="mt-4 grid gap-3 lg:grid-cols-2">
{maintenance.slice(0, 4).map((request) => (
<article key={request.id} className="rounded-[1rem] border border-[var(--color-dormmate-border)] p-4">
<div className="flex items-start justify-between gap-3">
<div className="min-w-0">
<p className="truncate font-semibold text-[#0d1b2a]">{request.category}</p>
<p className="mt-1 truncate text-xs text-[var(--color-dormmate-muted)]">{request.tenantName} · {formatLocation(request)}</p>
</div>
<span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${request.status === "resolved" ? "bg-[#f0f1ee] text-[#1b263b]" : request.status === "pending" ? "bg-[#fff8e7] text-[#a66f12]" : "bg-[#e0e1dd] text-[#415a77]"}`}>{statusLabel(request.status)}</span>
</div>
<p className="mt-3 line-clamp-2 text-sm leading-5 text-[var(--color-dormmate-text)]">{request.description}</p>
<p className="mt-3 text-xs text-[#415a77]">Submitted {dateFormatter.format(new Date(request.createdAt))}</p>
</article>
))}
</div>
)}
</section>
</div>
);
}
