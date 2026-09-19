export type DueStatus = "upcoming" | "due_soon" | "due_today" | "overdue" | "paid";

export function getCurrentDueStatus(dueDate: string, paymentStatus?: string | null): DueStatus {
  if (paymentStatus === "paid") return "paid";

  const today = new Date().toISOString().slice(0, 10);
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "due_today";

  const dueSoonLimit = new Date(`${today}T00:00:00Z`);
  dueSoonLimit.setUTCDate(dueSoonLimit.getUTCDate() + 31);
  return dueDate <= dueSoonLimit.toISOString().slice(0, 10) ? "due_soon" : "upcoming";
}