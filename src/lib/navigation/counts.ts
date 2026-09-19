import { createClient } from "@/utils/supabase/server";

async function safeCount(query: PromiseLike<{ count: number | null; error: unknown }>) {
  const result = await query;
  return result.error ? 0 : result.count ?? 0;
}

export async function getAdminNavigationCounts() {
  const supabase = await createClient();
  const landlordApprovals = await safeCount(
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "landlord")
      .eq("account_status", "pending"),
  );

  return { landlordApprovals };
}

export async function getLandlordNavigationCounts(profileId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tenantApprovals, pendingPayments, overdueRent, unreadMessages, unreadNotifications] = await Promise.all([
    safeCount(
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "tenant")
        .eq("account_status", "pending"),
    ),
    safeCount(
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "pending"),
    ),
    safeCount(
      supabase
        .from("rental_obligations")
        .select("id", { count: "exact", head: true })
        .lt("due_date", today)
        .neq("payment_status", "paid"),
    ),
    safeCount(
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_profile_id", profileId)
        .eq("is_read", false),
    ),
    safeCount(
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_profile_id", profileId)
        .eq("is_read", false),
    ),
  ]);

  return { tenantApprovals, pendingPayments, overdueRent, unreadMessages, unreadNotifications };
}

export async function getTenantNavigationCounts(profileId: string) {
  const supabase = await createClient();
  const [unreadMessages, unreadNotifications] = await Promise.all([
    safeCount(
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_profile_id", profileId)
        .eq("is_read", false),
    ),
    safeCount(
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_profile_id", profileId)
        .eq("is_read", false),
    ),
  ]);

  return { unreadMessages, unreadNotifications };
}