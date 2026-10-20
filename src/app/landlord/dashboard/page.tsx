import Link from "next/link";

import { generateRentalAnalyticsInsights } from "@/lib/api/openrouter/rental-analytics";
import { requireLandlordAccess } from "@/lib/auth/utils";
import { getEnabledFeatureKeys } from "@/lib/features/access";
import { getLandlordNotifications, getPendingTenantRegistrationCount } from "@/lib/landlord/data";
import { getLandlordRentalAnalytics, type RentalAnalyticsSnapshot } from "@/lib/landlord/rental-analytics";

export const metadata = { title: "AI Rental Analytics Dashboard | RentSpace" };

const currencyFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const compactCurrencyFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" });

function MetricCard({ label, value, helper, tone = "text-[var(--color-dormmate-text-strong)]" }: { label: string; value: string; helper: string; tone?: string }) {
  return (
    <article className="rounded-[1.2rem] bg-white p-4 shadow-[var(--shadow)]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-dormmate-muted)]">{label}</p>
      <strong className={`mt-2 block text-2xl tracking-tight ${tone}`}>{value}</strong>
      <p className="mt-1 text-xs leading-5 text-[var(--color-dormmate-muted)]">{helper}</p>
    </article>
  );
}

async function AiInsights({ analytics }: { analytics: RentalAnalyticsSnapshot }) {
  let insights: string | null = null;

  try {
    insights = await generateRentalAnalyticsInsights(analytics);
  } catch (error) {
    console.error("AI Rental Analytics dashboard interpretation failed:", error);
  }

  return insights
    ? <div className="mt-4 whitespace-pre-line text-sm leading-7 text-[var(--color-dormmate-text)]">{insights}</div>
    : (
        <div className="mt-4 rounded-[1rem] border border-[#d7dfdc] bg-[#f5f8f7] p-4 text-sm leading-6 text-[var(--color-dormmate-muted)]">
          Live AI insights could not be loaded. All verified metrics, trends, and priority records on this dashboard remain available.
        </div>
      );
}

function TrendChart({ trends }: { trends: RentalAnalyticsSnapshot["trends"] }) {
  const maximumAmount = Math.max(...trends.flatMap((item) => [item.amountDue, item.amountCollected]), 0);

  return (
    <article className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Six-month trend</p>
          <h2 className="mt-1.5 text-xl font-bold text-[var(--color-dormmate-text-strong)]">Expected rent vs. collected</h2>
        </div>
        <div className="flex gap-3 text-xs font-medium text-[var(--color-dormmate-muted)]">
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[#b9cbc7]" />Expected</span>
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[var(--color-dormmate-primary)]" />Collected</span>
        </div>
      </div>
      <div className="mt-6 flex h-64 items-end gap-2 border-b border-[var(--color-dormmate-border)] px-1 sm:gap-4 sm:px-3" aria-label="Expected and collected rent for the last six months">
        {trends.map((month) => {
          const dueHeight = maximumAmount > 0 ? Math.max((month.amountDue / maximumAmount) * 100, month.amountDue > 0 ? 5 : 1) : 1;
          const collectedHeight = maximumAmount > 0 ? Math.max((month.amountCollected / maximumAmount) * 100, month.amountCollected > 0 ? 5 : 1) : 1;
          return (
            <div key={month.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <div className="flex flex-1 items-end justify-center gap-1 sm:gap-2">
                <div className="w-1/2 max-w-7 rounded-t-md bg-[#b9cbc7]" style={{ height: `${dueHeight}%` }} title={`Expected: ${currencyFormatter.format(month.amountDue)}`} />
                <div className="w-1/2 max-w-7 rounded-t-md bg-[var(--color-dormmate-primary)]" style={{ height: `${collectedHeight}%` }} title={`Collected: ${currencyFormatter.format(month.amountCollected)}`} />
              </div>
              <span className="mt-2 truncate text-center text-[10px] font-semibold text-[var(--color-dormmate-muted)] sm:text-xs">{month.label.split(" ")[0]}</span>
              <span className="mt-0.5 text-center text-[10px] font-bold text-[#315a57]">{month.collectionRate}%</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[var(--color-dormmate-muted)]">Bars use rental obligations due in each month; the percentage is the verified collection rate.</p>
    </article>
  );
}

export default async function LandlordDashboardPage() {
  const { profile } = await requireLandlordAccess();
  const enabledFeatures = await getEnabledFeatureKeys(profile);
  if (!enabledFeatures.has("dashboard")) return <p className="sr-only">Dashboard content has been disabled by an administrator.</p>;

  const [analytics, pendingRegistrations, notifications] = await Promise.all([
    getLandlordRentalAnalytics(),
    getPendingTenantRegistrationCount(),
    getLandlordNotifications(),
  ]);
  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const aiEnabled = enabledFeatures.has("ai_assistant");
  const hasOperationalData = analytics.totalActiveSpaces > 0 || analytics.trends.some((item) => item.amountDue > 0) || analytics.openMaintenanceRequests > 0;

  return (
    <div className="space-y-4">
      <section className="portal-hero overflow-hidden rounded-[1.5rem] text-white">
        <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9fb9b5]">AI Rental Analytics Dashboard</p>
              <span className="rounded-full bg-[#d9f2df] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#286337]">Verified data</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">Portfolio performance, priorities, and AI insights</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#e0e1dd]">Track collections, occupancy, overdue balances, payment workload, maintenance performance, and the operational items that need your attention.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {aiEnabled ? <Link href="/landlord/ai-assistant" className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20">Ask AI Assistant</Link> : null}
            <Link href={`/landlord/reports?month=${analytics.currentMonth}`} className="rounded-xl bg-[#f4cf58] px-4 py-3 text-sm font-bold text-[#253d3b] transition hover:bg-[#ffdc69]">Open monthly report</Link>
          </div>
        </div>
      </section>

      {!hasOperationalData ? (
        <section className="rounded-[1.35rem] border border-dashed border-[var(--color-dormmate-border)] bg-white p-6 text-center shadow-[var(--shadow)]">
          <h2 className="text-lg font-bold text-[var(--color-dormmate-text-strong)]">Analytics will appear as records are added</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--color-dormmate-muted)]">Configure rental spaces, assign tenants, and create rent obligations to establish portfolio performance trends.</p>
          <Link href="/landlord/units" className="mt-4 inline-flex rounded-xl bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white">Manage rental spaces</Link>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label={`${analytics.currentMonthLabel} rental analytics highlights`}>
        <MetricCard label="Expected rent" value={currencyFormatter.format(analytics.expectedRent)} helper={`${analytics.currentMonthLabel} obligations`} />
        <MetricCard label="Collected" value={currencyFormatter.format(analytics.collectedRent)} helper={`${analytics.collectionRate}% collection rate`} tone="text-[#315a57]" />
        <MetricCard label="Outstanding" value={currencyFormatter.format(analytics.outstandingBalance)} helper={`${analytics.overdueTenants} tenant${analytics.overdueTenants === 1 ? "" : "s"} overdue`} tone="text-[#b87417]" />
        <MetricCard label="Occupancy" value={`${analytics.occupancyRate}%`} helper={`${analytics.occupiedSpaces} occupied · ${analytics.availableSpaces} available`} tone="text-[#1b263b]" />
      </section>

      <TrendChart trends={analytics.trends} />

      {aiEnabled ? (
        <section className="rounded-[1.35rem] border border-[#cbd9d5] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">AI insights</p><h2 className="mt-1.5 text-xl font-bold text-[var(--color-dormmate-text-strong)]">Portfolio briefing</h2><p className="mt-1 text-xs text-[var(--color-dormmate-muted)]">Generated from aggregate verified metrics; no tenant identities or raw descriptions are sent.</p></div>
            <Link href="/landlord/ai-assistant" className="text-sm font-semibold text-[var(--color-dormmate-primary)] hover:underline">Ask a follow-up →</Link>
          </div>
          <AiInsights analytics={analytics} />
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Operational action center">
        {[
          { label: "Tenant registrations", value: pendingRegistrations, helper: "awaiting approval review", href: "/landlord/approvals", tone: "bg-[#e7f0ee] text-[#315a57]" },
          { label: "Payment verification", value: analytics.pendingPayments, helper: "pending submissions", href: "/landlord/payments", tone: "bg-[#fff4d9] text-[#9a6b16]" },
          { label: "Open maintenance", value: analytics.openMaintenanceRequests, helper: `${analytics.maintenanceResolvedThisMonth} resolved this month`, href: "/landlord/maintenance", tone: "bg-[#f0f1ee] text-[#415a77]" },
          { label: "Notifications", value: unreadNotifications, helper: "unread updates", href: "/landlord/notifications", tone: "bg-[#fbe9e5] text-[#b9573b]" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="flex items-center gap-4 rounded-[1.2rem] bg-white p-4 shadow-[var(--shadow)] transition hover:-translate-y-0.5">
            <span className={`grid h-12 min-w-12 place-items-center rounded-xl text-lg font-bold ${item.tone}`}>{item.value}</span>
            <span><strong className="block text-sm text-[var(--color-dormmate-text-strong)]">{item.label}</strong><span className="mt-1 block text-xs text-[var(--color-dormmate-muted)]">{item.helper}</span></span>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b87417]">Collection risk</p><h2 className="mt-1.5 text-xl font-bold text-[var(--color-dormmate-text-strong)]">Largest overdue balances</h2></div><Link href="/landlord/rent-monitoring" className="text-sm font-semibold text-[var(--color-dormmate-primary)] hover:underline">View all →</Link></div>
          {analytics.overdueRecords.length === 0 ? <p className="mt-4 rounded-[1rem] bg-[#f5f6f4] p-4 text-sm text-[var(--color-dormmate-muted)]">No overdue balances need follow-up.</p> : <div className="mt-4 space-y-2.5">{analytics.overdueRecords.slice(0, 5).map((item) => <Link key={item.rentalObligationId} href="/landlord/rent-monitoring" className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--color-dormmate-border)] p-3 transition hover:bg-[#f8f8f6]"><span className="min-w-0"><strong className="block truncate text-sm text-[var(--color-dormmate-text-strong)]">{item.tenantName}</strong><span className="mt-1 block truncate text-xs text-[var(--color-dormmate-muted)]">{item.location} · due {dateFormatter.format(new Date(`${item.dueDate}T00:00:00`))}</span></span><strong className="shrink-0 text-sm text-[#b87417]">{compactCurrencyFormatter.format(item.balance)}</strong></Link>)}</div>}
        </article>

        <article className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Service risk</p><h2 className="mt-1.5 text-xl font-bold text-[var(--color-dormmate-text-strong)]">Oldest unresolved requests</h2></div><Link href="/landlord/maintenance" className="text-sm font-semibold text-[var(--color-dormmate-primary)] hover:underline">View all →</Link></div>
          {analytics.maintenanceRisks.length === 0 ? <p className="mt-4 rounded-[1rem] bg-[#f5f6f4] p-4 text-sm text-[var(--color-dormmate-muted)]">No unresolved maintenance requests.</p> : <div className="mt-4 space-y-2.5">{analytics.maintenanceRisks.slice(0, 5).map((item) => <Link key={item.id} href="/landlord/maintenance" className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--color-dormmate-border)] p-3 transition hover:bg-[#f8f8f6]"><span className="min-w-0"><strong className="block truncate text-sm text-[var(--color-dormmate-text-strong)]">{item.category}</strong><span className="mt-1 block truncate text-xs text-[var(--color-dormmate-muted)]">{item.tenantName} · {item.location} · {item.status.replaceAll("_", " ")}</span></span><span className="shrink-0 rounded-full bg-[#fff4d9] px-2.5 py-1 text-xs font-bold text-[#9a6b16]">{item.ageDays}d open</span></Link>)}</div>}
        </article>
      </section>
    </div>
  );
}