import Link from "next/link";

import { CreateAdminForm } from "@/components/admin/create-admin-form";
import type { Profile } from "@/lib/auth/types";
import { getDisplayName, requireAdminAccess } from "@/lib/auth/utils";
import { createClient } from "@/utils/supabase/server";

export const metadata = { title: "Admin Dashboard | RentSpace" };

function statusTone(status: Profile["account_status"]) {
  if (status === "approved") return "bg-[#e8f3e7] text-[#346b3a]";
  if (status === "pending") return "bg-[#fff4d9] text-[#9a6b16]";
  if (status === "rejected") return "bg-[#fbe9e5] text-[#b9573b]";
  return "bg-[#f0f1ee] text-[#415a77]";
}

export default async function AdminDashboardPage() {
  const { profile } = await requireAdminAccess();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, account_status, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load the administrative account overview.");

  const accounts = data ?? [];
  const managedAccounts = accounts.filter((account) => account.role !== "admin");
  const landlords = accounts.filter((account) => account.role === "landlord");
  const tenants = accounts.filter((account) => account.role === "tenant");
  const pendingLandlords = landlords.filter((account) => account.account_status === "pending");
  const pendingTenants = tenants.filter((account) => account.account_status === "pending");
  const approvedCount = managedAccounts.filter((account) => account.account_status === "approved").length;
  const inactiveCount = managedAccounts.filter((account) => account.account_status === "inactive").length;
  const recentAccounts = managedAccounts.slice(0, 5);

  return (
    <div className="space-y-4">
      <section className="portal-hero overflow-hidden rounded-[1.5rem] text-white">
        <div className="grid gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="dashboard-kicker">Admin dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">Welcome, {getDisplayName(profile)}</h1>
            <p className="mt-2 text-sm text-[#e0e1dd]">Accounts, approvals, and access at a glance.</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <span className="rounded-full bg-[#dcebdd] px-3 py-1.5 text-xs font-semibold text-[#2f6737]">Administrator account</span>
            {pendingLandlords.length > 0 ? <span className="rounded-full bg-[#fff4d9] px-3 py-1.5 text-xs font-semibold text-[#8c6218]">{pendingLandlords.length} landlord approval{pendingLandlords.length === 1 ? "" : "s"} pending</span> : null}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "All accounts", value: managedAccounts.length, detail: "Landlords + tenants", tone: "text-[var(--color-dormmate-text-strong)]" },
          { label: "Approved", value: approvedCount, detail: "Active access", tone: "text-[#1b263b]" },
          { label: "Pending reviews", value: pendingLandlords.length + pendingTenants.length, detail: `${pendingLandlords.length} landlord · ${pendingTenants.length} tenant`, tone: "text-[#a87419]" },
          { label: "Inactive", value: inactiveCount, detail: "No access", tone: "text-[#647169]" },
        ].map((stat) => (
          <article key={stat.label} className="interactive-card surface-elevated min-w-0 rounded-[1.2rem] bg-white/90 p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-dormmate-muted)]">{stat.label}</p>
            <p className={`mt-3 text-2xl font-semibold sm:text-3xl ${stat.tone}`}>{stat.value}</p>
            <p className="mt-1 truncate text-xs text-[var(--color-dormmate-muted)] sm:text-sm">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <article className="rounded-[1.35rem] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Admin tools</p><h2 className="mt-2 text-xl font-semibold text-[var(--color-dormmate-text-strong)]">Quick actions</h2></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href="/admin/users" className="group flex items-center gap-4 rounded-[1rem] border border-[var(--color-dormmate-border)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-dormmate-primary)] hover:bg-[#f8f8f6]">
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e7f0ee] font-bold text-[var(--color-dormmate-primary)]">U</span>
              <span className="min-w-0 flex-1"><strong className="block text-[var(--color-dormmate-text-strong)]">User accounts</strong><span className="mt-1 block text-sm text-[var(--color-dormmate-muted)]">Manage access and status</span></span>
              <span aria-hidden="true" className="text-lg text-[var(--color-dormmate-primary)]">→</span>
            </Link>
            <Link href="/admin/landlords" className="group flex items-center gap-4 rounded-[1rem] border border-[var(--color-dormmate-border)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-dormmate-primary)] hover:bg-[#f8f8f6]">
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff4d9] font-bold text-[#9a6b16]">L</span>
              <span className="min-w-0 flex-1"><strong className="block text-[var(--color-dormmate-text-strong)]">Landlord approvals</strong><span className="mt-1 block text-sm text-[var(--color-dormmate-muted)]">{pendingLandlords.length} waiting for review</span></span>
              <span aria-hidden="true" className="text-lg text-[var(--color-dormmate-primary)]">→</span>
            </Link>
          </div>
          <div className="mt-4 rounded-[1rem] bg-[#f5f6f4] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold text-[var(--color-dormmate-text-strong)]">Account mix</p><div className="flex gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1b263b]">{landlords.length} landlords</span><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#415a77]">{tenants.length} tenants</span></div></div>
          </div>
        </article>

        <article className="rounded-[1.35rem] bg-white p-5 shadow-[var(--shadow)] sm:p-6">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">Registration activity</p><h2 className="mt-2 text-xl font-semibold text-[var(--color-dormmate-text-strong)]">Recent accounts</h2></div>
          {recentAccounts.length === 0 ? (
            <div className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] p-4 text-sm text-[var(--color-dormmate-muted)]">No accounts yet.</div>
          ) : (
            <div className="mt-4 divide-y divide-[var(--color-dormmate-border)]">
              {recentAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-semibold text-[var(--color-dormmate-text-strong)]">{`${account.first_name} ${account.last_name}`.trim()}</p><p className="mt-0.5 truncate text-xs text-[var(--color-dormmate-muted)]">{account.email ?? "No email available"} · <span className="capitalize">{account.role}</span></p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(account.account_status as Profile["account_status"])}`}>{account.account_status}</span></div>
              ))}
            </div>
          )}
          <Link href="/admin/users" className="mt-5 inline-flex text-sm font-semibold text-[var(--color-dormmate-primary)]">View all managed accounts →</Link>
        </article>
      </section>

      <div id="admin-continuity">
        <CreateAdminForm />
      </div>
    </div>
  );
}