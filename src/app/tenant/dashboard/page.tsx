import Link from "next/link";

import { requireTenantAccess } from "@/lib/auth/utils";
import { getTenantNotifications, getTenantRentalSnapshot } from "@/lib/tenant/data";

export const metadata = { title: "Tenant Dashboard | RentSpace" };

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value ?? 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not yet available";
  return new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function getLocationLabel(snapshot: Awaited<ReturnType<typeof getTenantRentalSnapshot>>) {
  if (!snapshot?.unitName) return "No active rental assignment";
  if (snapshot.assignmentType === "bed_space") return `${snapshot.unitName} · Room: ${snapshot.roomNumber ?? "—"} · ${snapshot.bedLabel ?? "Bed space"}`;
  if (snapshot.assignmentType === "room_space") return `${snapshot.unitName} · Room: ${snapshot.roomNumber ?? "—"}`;
  return snapshot.unitName;
}

function getAssignmentTypeLabel(type: string | null | undefined) {
  if (type === "bed_space") return "Bed Space";
  if (type === "room_space") return "Room Space";
  if (type === "apartment") return "Apartment Unit";
  return "Not assigned";
}

function getStatusTone(status: string | null | undefined) {
  if (status === "paid" || status === "active") return "bg-[#e8f3e7] text-[#346b3a]";
  if (status === "overdue" || status === "rejected") return "bg-[#fbe9e5] text-[#b9573b]";
  if (status === "pending_verification" || status === "due_soon" || status === "due_today") return "bg-[#fff4d9] text-[#9a6b16]";
  return "bg-[#f0f1ee] text-[#415a77]";
}

function getPaymentGuidance(status: string | null | undefined, hasObligation: boolean) {
  if (!hasObligation) return "No bill issued yet.";
  if (status === "paid") return "Payment verified.";
  if (status === "pending_verification") return "Proof awaiting review.";
  if (status === "rejected") return "Payment proof needs attention.";
  return "Pay by the due date.";
}

export default async function TenantDashboardPage() {
  const { profile } = await requireTenantAccess();
  const [rentalSnapshot, notifications] = await Promise.all([
    getTenantRentalSnapshot(profile.id),
    getTenantNotifications(profile.id),
  ]);

  const paymentStatus = rentalSnapshot?.paymentStatus ?? null;
  const amountDue = rentalSnapshot?.amountDue ?? 0;
  const amountPaid = rentalSnapshot?.amountPaid ?? 0;
  const balance = Math.max(amountDue - amountPaid, 0);
  const recentNotifications = notifications.slice(0, 3);
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const tenantName = `${profile.first_name} ${profile.last_name}`.trim();

  return (
    <div className="space-y-4">
      <section className="portal-hero overflow-hidden rounded-[1.5rem] text-white">
        <div className="grid gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="dashboard-kicker">Tenant dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">Welcome, {tenantName}</h1>
            <p className="mt-2 text-sm text-[#e0e1dd]">Your rent and rental details in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${profile.account_status === "approved" ? "bg-[#dcebdd] text-[#2f6737]" : "bg-white/15 text-white"}`}>Account: {profile.account_status === "approved" ? "Active" : profile.account_status}</span>
            {rentalSnapshot?.dueStatus ? <span className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${getStatusTone(rentalSnapshot.dueStatus)}`}>Rent: {rentalSnapshot.dueStatus.replaceAll("_", " ")}</span> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <article className="rounded-[1.35rem] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-dormmate-border)] pb-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Current rent</p><h2 className="mt-2 text-xl font-semibold text-[var(--color-dormmate-text-strong)]">Billing summary</h2></div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${getStatusTone(paymentStatus)}`}>{paymentStatus?.replaceAll("_", " ") ?? "No billing record"}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-4">
            <div className="min-w-0 rounded-[1rem] bg-[#f5f6f4] p-3 sm:p-4"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-dormmate-muted)] sm:text-xs">Amount due</p><p className="mt-1.5 truncate text-lg font-semibold tracking-tight text-[var(--color-dormmate-text-strong)] sm:mt-2 sm:text-2xl">{formatCurrency(amountDue)}</p></div>
            <div className="min-w-0 rounded-[1rem] bg-[#f5f6f4] p-3 sm:p-4"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-dormmate-muted)] sm:text-xs">Amount paid</p><p className="mt-1.5 truncate text-lg font-semibold tracking-tight text-[#1b263b] sm:mt-2 sm:text-2xl">{formatCurrency(amountPaid)}</p></div>
            <div className="min-w-0 rounded-[1rem] bg-[#f5f6f4] p-3 sm:p-4"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-dormmate-muted)] sm:text-xs">Remaining balance</p><p className={`mt-1.5 truncate text-lg font-semibold tracking-tight sm:mt-2 sm:text-2xl ${balance > 0 ? "text-[#b87417]" : "text-[#1b263b]"}`}>{formatCurrency(balance)}</p></div>
          </div>
          <div className="mt-5 flex flex-col gap-4 rounded-[1rem] border border-[var(--color-dormmate-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-medium uppercase tracking-wide text-[var(--color-dormmate-muted)]">Payment due date</p><p className="mt-1 font-bold text-[var(--color-dormmate-text-strong)]">{formatDate(rentalSnapshot?.dueDate)}</p><p className="mt-1 max-w-xl text-sm leading-6 text-[var(--color-dormmate-muted)]">{getPaymentGuidance(paymentStatus, Boolean(rentalSnapshot?.obligationId))}</p></div>
            <Link href="/tenant/my-rental" className="shrink-0 rounded-[12px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90">View statement</Link>
          </div>
        </article>

        <article className="rounded-[1.35rem] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">My space</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-dormmate-text-strong)]">Rental details</h2>
          <dl className="mt-5 divide-y divide-[var(--color-dormmate-border)]">
            <div className="py-3 first:pt-0"><dt className="text-xs text-[var(--color-dormmate-muted)]">Assigned rental space</dt><dd className="mt-1 font-semibold text-[var(--color-dormmate-text-strong)]">{getLocationLabel(rentalSnapshot)}</dd></div>
            <div className="py-3"><dt className="text-xs text-[var(--color-dormmate-muted)]">Accommodation type</dt><dd className="mt-1 font-medium">{getAssignmentTypeLabel(rentalSnapshot?.assignmentType)}</dd></div>
            <div className="py-3"><dt className="text-xs text-[var(--color-dormmate-muted)]">Occupancy start date</dt><dd className="mt-1 font-medium">{formatDate(rentalSnapshot?.startDate)}</dd></div>
            <div className="py-3 pb-0"><dt className="text-xs text-[var(--color-dormmate-muted)]">Billing period</dt><dd className="mt-1 font-medium">{rentalSnapshot?.periodStart ? `${formatDate(rentalSnapshot.periodStart)} – ${formatDate(rentalSnapshot.periodEnd)}` : "Not yet available"}</dd></div>
          </dl>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <article className="rounded-[1.35rem] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Services</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-dormmate-text-strong)]">Quick actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3">
            {[
              { href: "/tenant/my-rental", title: "Payments", description: "Bills and payment proof", mark: "₱" },
              { href: "/tenant/maintenance", title: "Maintenance", description: "Report and track issues", mark: "M" },
              { href: "/tenant/messages", title: "Messages", description: "Contact your landlord", mark: "✦" },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="group min-w-0 rounded-[1rem] border border-[var(--color-dormmate-border)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--color-dormmate-primary)] hover:bg-[#f8f8f6] sm:p-4">
                <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7f0ee] text-sm font-bold text-[var(--color-dormmate-primary)] sm:h-10 sm:w-10 sm:text-base">{action.mark}</span>
                <h3 className="mt-3 truncate text-sm font-semibold text-[var(--color-dormmate-text-strong)] group-hover:text-[var(--color-dormmate-primary)] sm:mt-4 sm:text-base">{action.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--color-dormmate-muted)] sm:text-sm">{action.description}</p>
                <span className="mt-3 inline-flex text-xs font-semibold text-[var(--color-dormmate-primary)] sm:mt-4 sm:text-sm">Open →</span>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-[1.35rem] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Official notices</p><h2 className="mt-2 text-xl font-semibold text-[var(--color-dormmate-text-strong)]">Recent notifications</h2></div>{unreadCount > 0 ? <span className="rounded-full bg-[#fff4d9] px-2.5 py-1 text-xs font-semibold text-[#9a6b16]">{unreadCount} unread</span> : null}</div>
          {recentNotifications.length === 0 ? (
            <div className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] p-4 text-sm text-[var(--color-dormmate-muted)]">No notifications yet.</div>
          ) : (
            <div className="mt-4 divide-y divide-[var(--color-dormmate-border)]">
              {recentNotifications.map((notification) => (
                <div key={notification.id} className="py-3 first:pt-0 last:pb-0"><div className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? "bg-[#c5cec8]" : "bg-[var(--color-dormmate-primary)]"}`} /><div className="min-w-0"><p className="font-semibold text-[var(--color-dormmate-text-strong)]">{notification.title}</p><p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--color-dormmate-muted)]">{notification.message}</p><p className="mt-1.5 text-xs text-[var(--color-dormmate-muted)]">{new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(notification.created_at))}</p></div></div></div>
              ))}
            </div>
          )}
          <Link href="/tenant/notifications" className="mt-5 inline-flex text-sm font-semibold text-[var(--color-dormmate-primary)]">View all notifications →</Link>
        </article>
      </section>
    </div>
  );
}