import { requireTenantAccess } from "@/lib/auth/utils";
import { getTenantNotifications } from "@/lib/tenant/data";

import { NotificationReadButton } from "@/components/tenant/notification-read-button";
import { TenantNotificationMarkAllButton } from "@/components/tenant/notification-mark-all-button";

export const metadata = {
  title: "Notifications | RentSpace",
};

function getTone(notificationType: string) {
  if (notificationType.includes("confirmed")) return "bg-[#1d8b4d]";
  return "bg-[#d6a135]";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function TenantNotificationsPage() {
  const { profile } = await requireTenantAccess();
  const notifications = await getTenantNotifications(profile.id);
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Updates</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[1.55rem] font-semibold tracking-tight text-[#0d1b2a] sm:text-[1.8rem]">Notifications</h1>
          <TenantNotificationMarkAllButton disabled={unreadCount === 0} />
        </div>
      </section>

      <section className="space-y-3">
        {notifications.length ? (
          notifications.map((notification) => (
            <article key={notification.id} className="rounded-[1.15rem] bg-white p-4 shadow-[var(--shadow)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${getTone(notification.notification_type)}`} />
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-[#0d1b2a]">{notification.title}</h2>
                    <p className="mt-1.5 text-sm leading-6 text-[#415a77]">{notification.message}</p>
                    <div className="mt-2">
                      <NotificationReadButton notificationId={notification.id} />
                    </div>
                  </div>
                </div>

                <p className="shrink-0 text-xs text-[#7f8c85]">{formatDateTime(notification.created_at)}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[1.15rem] bg-white p-5 text-sm text-[#415a77] shadow-[var(--shadow)]">
            No notifications yet.
          </div>
        )}
      </section>
    </div>
  );
}