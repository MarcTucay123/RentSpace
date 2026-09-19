import { requireLandlordAccess } from "@/lib/auth/utils";
import { getLandlordNotifications } from "@/lib/landlord/data";
import { FilterNavigation } from "@/components/ui/filter-navigation";
import { LandlordNotificationMarkAllButton } from "@/components/landlord/notification-mark-all-button";

export const metadata = {
  title: "Notifications | RentSpace",
};

function getNotificationTone(type: string) {
  if (type.includes("payment")) return "bg-[#fff8e7] text-[#c08a26]";
  if (type.includes("maintenance")) return "bg-[#e0e1dd] text-[#415a77]";
  if (type.includes("approval") || type.includes("registration")) return "bg-[#f0f1ee] text-[#1b263b]";
  return "bg-[#f5f6f4] text-[#415a77]";
}

type NotificationsPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LandlordNotificationsPage({ searchParams }: NotificationsPageProps) {
  await requireLandlordAccess();
  const [notifications, params] = await Promise.all([getLandlordNotifications(), searchParams]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const paymentCount = notifications.filter((item) => item.notificationType.includes("payment")).length;
  const maintenanceCount = notifications.filter((item) => item.notificationType.includes("maintenance")).length;
  const requestedFilter = typeof params.filter === "string" ? params.filter : "all";
  const selectedFilter = ["all", "unread", "payment", "maintenance"].includes(requestedFilter) ? requestedFilter : "all";
  const filteredNotifications = notifications.filter((item) => {
    if (selectedFilter === "unread") return !item.isRead;
    if (selectedFilter !== "all") return item.notificationType.includes(selectedFilter);
    return true;
  });

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Notifications</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">Landlord alert center</h2>
          <LandlordNotificationMarkAllButton disabled={unreadCount === 0} />
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-dormmate-muted)]">
          Review recent landlord-visible alerts related to tenant activity, payments, maintenance, and other system events.
        </p>
      </section>

      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <FilterNavigation
          basePath="/landlord/notifications"
          selected={selectedFilter}
          label="Filter Notifications"
          options={[
            { value: "all", label: "All", count: notifications.length },
            { value: "unread", label: "Unread", count: unreadCount },
            { value: "payment", label: "Payments", count: paymentCount },
            { value: "maintenance", label: "Maintenance", count: maintenanceCount },
          ]}
        />
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Recent activity</p>
            <h3 className="mt-2 text-[1.35rem] font-semibold text-[var(--color-dormmate-text-strong)]">Notification feed</h3>
          </div>
          <span className="text-sm text-[var(--color-dormmate-muted)]">{filteredNotifications.length} alert{filteredNotifications.length === 1 ? "" : "s"}</span>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] bg-[var(--color-dormmate-surface)] p-5 text-sm text-[var(--color-dormmate-muted)]">
            No Notifications match this filter.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredNotifications.map((item) => (
              <article key={item.id} className="rounded-[1.15rem] border border-[var(--color-dormmate-border)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h4 className="text-lg font-semibold text-[var(--color-dormmate-text-strong)]">{item.title}</h4>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getNotificationTone(item.notificationType)}`}>
                        {item.notificationType.replaceAll("_", " ")}
                      </span>
                      {!item.isRead ? (
                        <span className="rounded-full bg-[#fbe9e5] px-2.5 py-1 text-xs font-semibold text-[#cf6a4b]">Unread</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-dormmate-text)]">{item.message}</p>
                  </div>

                  <div className="grid gap-2 text-sm text-[var(--color-dormmate-muted)] lg:min-w-[280px]">
                    <p><span className="font-semibold text-[var(--color-dormmate-text-strong)]">Created:</span> {new Date(item.createdAt).toLocaleString()}</p>
                    <p><span className="font-semibold text-[var(--color-dormmate-text-strong)]">Reference:</span> {item.referenceType ?? "—"}</p>
                    <p><span className="font-semibold text-[var(--color-dormmate-text-strong)]">Reference ID:</span> {item.referenceId ?? "—"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}