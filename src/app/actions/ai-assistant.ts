"use server";

import { requireFeatureAccess } from "@/lib/features/access";
import {
  getLandlordMaintenanceRequests,
  getLandlordNotifications,
  getLandlordPayments,
  getLandlordRentMonitoring,
  getLandlordTenants,
  type LandlordRentMonitoringItem,
} from "@/lib/landlord/data";

export type AssistantReply = {
  answer: string;
  relatedHref?: string;
  relatedLabel?: string;
  generatedAt: string;
  error?: boolean;
};

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatLocation(item: { unitName: string | null; roomNumber: string | null; bedLabel: string | null }) {
  return [item.unitName, item.roomNumber ? `Room: ${item.roomNumber}` : null, item.bedLabel].filter(Boolean).join(" • ") || "location not set";
}

function summarizeObligations(items: LandlordRentMonitoringItem[], emptyMessage: string) {
  if (items.length === 0) return emptyMessage;

  const totalBalance = items.reduce((sum, item) => sum + item.balance, 0);
  const rows = items.slice(0, 8).map(
    (item) => `• ${item.tenantName} — ${formatLocation(item)} — ${currencyFormatter.format(item.balance)} balance, due ${formatDate(item.dueDate)}`,
  );
  if (items.length > rows.length) rows.push(`• Plus ${items.length - rows.length} more obligation${items.length - rows.length === 1 ? "" : "s"}.`);

  return `${items.length} obligation${items.length === 1 ? "" : "s"} totaling ${currencyFormatter.format(totalBalance)} need attention:\n${rows.join("\n")}`;
}

function includesAny(question: string, terms: string[]) {
  return terms.some((term) => question.includes(term));
}

function getTenantName(tenant: { firstName: string; lastName: string }) {
  return `${tenant.firstName} ${tenant.lastName}`.trim();
}

function getAdviceResponse({
  overdueCount,
  outstandingBalance,
  pendingPaymentCount,
  openMaintenanceCount,
  pendingTenantCount,
  unassignedTenantCount,
  unreadNotificationCount,
}: {
  overdueCount: number;
  outstandingBalance: number;
  pendingPaymentCount: number;
  openMaintenanceCount: number;
  pendingTenantCount: number;
  unassignedTenantCount: number;
  unreadNotificationCount: number;
}) {
  const priorities: string[] = [];

  if (overdueCount > 0) priorities.push(`1. Follow up on ${overdueCount} overdue Rent Obligation${overdueCount === 1 ? "" : "s"} totaling ${currencyFormatter.format(outstandingBalance)}. Review the ledger first, then use Messages to contact the affected Tenant accounts.`);
  if (pendingPaymentCount > 0) priorities.push(`${priorities.length + 1}. Review ${pendingPaymentCount} pending Payment submission${pendingPaymentCount === 1 ? "" : "s"} before sending rent reminders, because a Tenant may already have paid.`);
  if (openMaintenanceCount > 0) priorities.push(`${priorities.length + 1}. Check ${openMaintenanceCount} unresolved Maintenance Request${openMaintenanceCount === 1 ? "" : "s"}, acknowledge urgent concerns, and keep the status updated so Tenants can follow progress.`);
  if (pendingTenantCount > 0) priorities.push(`${priorities.length + 1}. Review ${pendingTenantCount} pending Tenant registration${pendingTenantCount === 1 ? "" : "s"}.`);
  if (unassignedTenantCount > 0) priorities.push(`${priorities.length + 1}. Review ${unassignedTenantCount} approved but unassigned Tenant${unassignedTenantCount === 1 ? "" : "s"} and assign a rental space when appropriate.`);
  if (unreadNotificationCount > 0) priorities.push(`${priorities.length + 1}. Read ${unreadNotificationCount} unread system Notification${unreadNotificationCount === 1 ? "" : "s"} for any remaining updates.`);

  if (priorities.length === 0) {
    return "Your visible RentSpace records do not show urgent follow-up items right now. I recommend checking upcoming rent dates, confirming unit availability, and keeping Tenant communication inside Messages so the conversation remains connected to the system.";
  }

  return `Recommended RentSpace action plan:\n${priorities.join("\n")}\n\nI provide operational guidance only. Please review the underlying record before making a decision or contacting a Tenant.`;
}

export async function askLandlordAssistant(rawQuestion: string, recentUserQuestions: string[] = []): Promise<AssistantReply> {
  await requireFeatureAccess("ai_assistant");

  const question = rawQuestion.trim();
  const generatedAt = new Date().toISOString();
  if (!question) return { answer: "Enter a question about your RentSpace operations.", generatedAt, error: true };
  if (question.length > 500) return { answer: "Please keep your question to 500 characters or fewer.", generatedAt, error: true };

  try {
    const [tenants, payments, maintenance, obligations, notifications] = await Promise.all([
      getLandlordTenants(),
      getLandlordPayments(),
      getLandlordMaintenanceRequests(),
      getLandlordRentMonitoring(),
      getLandlordNotifications(),
    ]);
    const normalized = question.toLowerCase();
    const pendingPayments = payments.filter((item) => item.verificationStatus === "pending");
    const overdue = obligations.filter((item) => item.dueStatus === "overdue" && item.paymentStatus !== "paid" && item.balance > 0);
    const dueSoon = obligations.filter((item) => item.dueStatus === "due_soon" || item.dueStatus === "due_today");
    const openMaintenance = maintenance.filter((item) => item.status !== "resolved");
    const unreadNotifications = notifications.filter((item) => !item.isRead);
    const outstandingBalance = overdue.reduce((sum, item) => sum + item.balance, 0);
    const approvedTenants = tenants.filter((item) => item.accountStatus === "approved");
    const pendingTenants = tenants.filter((item) => item.accountStatus === "pending");
    const unassignedTenants = approvedTenants.filter((item) => item.assignmentType === null);
    const normalizedWords = normalized.replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
    const fullNameMatch = tenants.find((tenant) => normalized.includes(getTenantName(tenant).toLowerCase()));
    const firstNameMatches = tenants.filter((tenant) => normalizedWords.includes(tenant.firstName.toLowerCase()));
    const isTenantFollowUp = includesAny(normalized, ["what should", "next step", "what next", "message them", "contact them", "remind them", "that tenant", "this tenant", "their account", "their rent", "their payment", "their maintenance"]);
    const recentContext = recentUserQuestions.slice(-3).join(" ").toLowerCase();
    const contextTenant = isTenantFollowUp ? tenants.find((tenant) => recentContext.includes(getTenantName(tenant).toLowerCase())) : undefined;
    const matchedTenant = fullNameMatch ?? (firstNameMatches.length === 1 ? firstNameMatches[0] : undefined) ?? contextTenant;
    const asksForAdvice = includesAny(normalized, ["advice", "advise", "recommend", "suggest", "what should", "what do i do", "next step", "action plan", "priority", "prioritize", "help me decide"]);
    const asksToCommunicate = includesAny(normalized, ["message", "contact", "communicate", "remind", "tell tenant", "notify tenant", "talk to"]);
    const asksToModifyRecords = includesAny(normalized, ["please approve", "approve tenant", "reject tenant", "assign tenant", "assign a tenant", "mark as", "delete record", "remove record", "update record", "change status"]);

    if (asksToModifyRecords) {
      return {
        answer: "I’m a read-only RentSpace adviser, so I can’t approve accounts, assign spaces, change statuses, or modify records. I can review the relevant system data, recommend the next step, and direct you to the correct page to complete it.",
        generatedAt,
      };
    }

    if (matchedTenant) {
      const tenantName = getTenantName(matchedTenant);
      const tenantObligations = obligations.filter((item) => item.tenantProfileId === matchedTenant.tenantProfileId);
      const tenantOverdueObligations = tenantObligations.filter((item) => item.dueStatus === "overdue" && item.paymentStatus !== "paid" && item.balance > 0);
      const tenantDueSoonObligations = tenantObligations.filter((item) => item.dueStatus === "due_soon" || item.dueStatus === "due_today");
      const tenantPendingPayments = pendingPayments.filter((item) => item.tenantProfileId === matchedTenant.tenantProfileId);
      const tenantMaintenance = openMaintenance.filter((item) => item.tenantName.toLowerCase() === tenantName.toLowerCase());
      const tenantBalance = tenantOverdueObligations.reduce((sum, item) => sum + item.balance, 0);
      const messageHref = `/landlord/messages?contact=${encodeURIComponent(matchedTenant.profileId)}`;

      if (asksToCommunicate) {
        if (matchedTenant.accountStatus !== "approved") {
          return {
            answer: `${tenantName} is currently ${matchedTenant.accountStatus}, so this account is not available as a RentSpace messaging contact. Review the Tenant account first. Once the account is approved, you can communicate through Messages.`,
            relatedHref: "/landlord/tenants",
            relatedLabel: "Review Tenant account",
            generatedAt,
          };
        }

        const messageReason = tenantOverdueObligations.length > 0
          ? `their overdue balance of ${currencyFormatter.format(tenantBalance)}`
          : tenantDueSoonObligations.length > 0
            ? `their Rent Obligation due ${formatDate(tenantDueSoonObligations[0].dueDate)}`
            : tenantPendingPayments.length > 0
              ? "their Payment submission that is awaiting verification"
              : tenantMaintenance.length > 0
                ? `their unresolved ${tenantMaintenance[0].category} Maintenance Request`
                : "their RentSpace account or rental concern";
        const draft = tenantOverdueObligations.length > 0
          ? `Hello ${matchedTenant.firstName}, this is a reminder that RentSpace shows an overdue rent balance of ${currencyFormatter.format(tenantBalance)}. Please reply here if you have already submitted payment or need to discuss the balance. Thank you.`
          : tenantDueSoonObligations.length > 0
            ? `Hello ${matchedTenant.firstName}, this is a friendly reminder that your rent is due ${formatDate(tenantDueSoonObligations[0].dueDate)}. Please use RentSpace for your payment update or reply here if you have a concern. Thank you.`
            : tenantMaintenance.length > 0
              ? `Hello ${matchedTenant.firstName}, I’m following up on your ${tenantMaintenance[0].category} Maintenance Request. We have recorded it in RentSpace and will keep the request status updated. Please reply here if there are important changes.`
              : `Hello ${matchedTenant.firstName}, I’m contacting you regarding ${messageReason}. Please reply through RentSpace so our conversation stays connected to your account. Thank you.`;

        return {
          answer: `I can help you communicate with ${tenantName} inside RentSpace, but I won’t send a message without your review.\n\nSuggested message:\n“${draft}”\n\nOpen the Tenant conversation, review the wording, and send it when ready.`,
          relatedHref: `${messageHref}&draft=${encodeURIComponent(draft)}`,
          relatedLabel: `Message ${tenantName}`,
          generatedAt,
        };
      }

      const recommendations: string[] = [];
      if (tenantPendingPayments.length > 0) recommendations.push(`Review ${tenantPendingPayments.length} pending Payment submission${tenantPendingPayments.length === 1 ? "" : "s"} before sending a reminder.`);
      if (tenantOverdueObligations.length > 0) recommendations.push(`Confirm the ledger, then send a respectful in-system reminder about the ${currencyFormatter.format(tenantBalance)} overdue balance.`);
      else if (tenantDueSoonObligations.length > 0) recommendations.push(`Consider sending a friendly reminder for the obligation due ${formatDate(tenantDueSoonObligations[0].dueDate)}.`);
      if (tenantMaintenance.length > 0) recommendations.push(`Review and update ${tenantMaintenance.length} unresolved Maintenance Request${tenantMaintenance.length === 1 ? "" : "s"}.`);
      if (matchedTenant.accountStatus === "approved" && !matchedTenant.assignmentType) recommendations.push("Review whether this approved Tenant should be assigned to an available rental space.");
      if (recommendations.length === 0) recommendations.push("No urgent record-based action is visible. Keep future communication in RentSpace Messages for a clear system history.");

      return {
        answer: `${tenantName} is ${matchedTenant.accountStatus}. Assignment: ${formatLocation(matchedTenant)}. Current Rent Obligations: ${tenantObligations.length}; overdue outstanding balance: ${currencyFormatter.format(tenantBalance)}.\n\nRecommended next step${recommendations.length === 1 ? "" : "s"}:\n${recommendations.map((item) => `• ${item}`).join("\n")}`,
        relatedHref: matchedTenant.accountStatus === "approved" && (asksForAdvice || recommendations.some((item) => item.includes("reminder"))) ? messageHref : "/landlord/tenants",
        relatedLabel: matchedTenant.accountStatus === "approved" && (asksForAdvice || recommendations.some((item) => item.includes("reminder"))) ? `Open conversation with ${tenantName}` : "View Tenants",
        generatedAt,
      };
    }

    if (asksToCommunicate) {
      return {
        answer: "I can help draft a system-related message and direct you to RentSpace Messages. Include the Tenant’s full name and the concern—such as overdue rent, a pending payment, or maintenance—so I can review the relevant record and prepare a suitable draft. I won’t send anything without your review.",
        relatedHref: "/landlord/messages",
        relatedLabel: "Open Tenant Messages",
        generatedAt,
      };
    }

    if (asksForAdvice) {
      const relatedHref = overdue.length > 0
        ? "/landlord/rent-monitoring?filter=overdue"
        : pendingPayments.length > 0
          ? "/landlord/payments?filter=pending"
          : openMaintenance.length > 0
            ? "/landlord/maintenance"
            : pendingTenants.length > 0 || unassignedTenants.length > 0
              ? "/landlord/tenants"
              : "/landlord/dashboard";
      return {
        answer: getAdviceResponse({
          overdueCount: overdue.length,
          outstandingBalance,
          pendingPaymentCount: pendingPayments.length,
          openMaintenanceCount: openMaintenance.length,
          pendingTenantCount: pendingTenants.length,
          unassignedTenantCount: unassignedTenants.length,
          unreadNotificationCount: unreadNotifications.length,
        }),
        relatedHref,
        relatedLabel: "Open highest-priority records",
        generatedAt,
      };
    }

    if (includesAny(normalized, ["pending verification", "pending payment", "payment submission", "verify payment"])) {
      const answer = pendingPayments.length === 0
        ? "There are no payment submissions pending verification."
        : `${pendingPayments.length} payment submission${pendingPayments.length === 1 ? " is" : "s are"} pending verification:\n${pendingPayments.slice(0, 8).map((item) => `• ${item.tenantName} — ${currencyFormatter.format(item.amount)} via ${item.paymentMethod.toUpperCase()} on ${formatDate(item.paymentDate)} — ${formatLocation(item)}`).join("\n")}${pendingPayments.length > 8 ? `\n• Plus ${pendingPayments.length - 8} more.` : ""}`;
      return { answer, relatedHref: "/landlord/payments?filter=pending", relatedLabel: "Review pending payments", generatedAt };
    }

    if (includesAny(normalized, ["maintenance", "repair", "unresolved", "open request"])) {
      const answer = openMaintenance.length === 0
        ? "There are no unresolved maintenance requests."
        : `${openMaintenance.length} maintenance request${openMaintenance.length === 1 ? " remains" : "s remain"} unresolved:\n${openMaintenance.slice(0, 8).map((item) => `• ${item.tenantName} — ${item.category} at ${formatLocation(item)} — ${item.status.replaceAll("_", " ")}\n  ${item.description}`).join("\n")}${openMaintenance.length > 8 ? `\n• Plus ${openMaintenance.length - 8} more.` : ""}`;
      return { answer, relatedHref: "/landlord/maintenance", relatedLabel: "Open Maintenance", generatedAt };
    }

    if (includesAny(normalized, ["overdue", "rent follow-up", "follow up", "follow-up", "need rent"])) {
      const followUps = [...overdue, ...dueSoon.filter((item) => !overdue.some((overdueItem) => overdueItem.rentalObligationId === item.rentalObligationId))];
      return {
        answer: summarizeObligations(followUps, "No Tenants currently have overdue, due-today, or due-soon Rent Obligations requiring follow-up."),
        relatedHref: overdue.length > 0 ? "/landlord/rent-monitoring?filter=overdue" : "/landlord/rent-monitoring?filter=due_soon",
        relatedLabel: "View Rent Monitoring",
        generatedAt,
      };
    }

    if (includesAny(normalized, ["tenant", "assignment", "occupied", "directory"])) {
      const approved = tenants.filter((item) => item.accountStatus === "approved").length;
      const assigned = tenants.filter((item) => item.assignmentType !== null).length;
      const pending = tenants.filter((item) => item.accountStatus === "pending").length;
      return {
        answer: `You have ${tenants.length} visible Tenant${tenants.length === 1 ? "" : "s"}: ${approved} approved, ${pending} pending, and ${assigned} with an active assignment. ${Math.max(approved - assigned, 0)} approved Tenant${approved - assigned === 1 ? " is" : "s are"} currently unassigned.`,
        relatedHref: "/landlord/tenants",
        relatedLabel: "View Tenants",
        generatedAt,
      };
    }

    if (includesAny(normalized, ["notification", "alert", "unread"])) {
      const rows = unreadNotifications.slice(0, 8).map((item) => `• ${item.title} — ${item.message}`);
      return {
        answer: unreadNotifications.length === 0 ? "You have no unread notifications." : `You have ${unreadNotifications.length} unread notification${unreadNotifications.length === 1 ? "" : "s"}:\n${rows.join("\n")}${unreadNotifications.length > 8 ? `\n• Plus ${unreadNotifications.length - 8} more.` : ""}`,
        relatedHref: "/landlord/notifications?filter=unread",
        relatedLabel: "View unread notifications",
        generatedAt,
      };
    }

    if (includesAny(normalized, ["payment", "collection", "paid"])) {
      const verified = payments.filter((item) => item.verificationStatus === "verified");
      const verifiedTotal = verified.reduce((sum, item) => sum + item.amount, 0);
      return {
        answer: `There are ${payments.length} payment submission${payments.length === 1 ? "" : "s"}: ${verified.length} verified and ${pendingPayments.length} pending verification. Verified submissions total ${currencyFormatter.format(verifiedTotal)}.`,
        relatedHref: "/landlord/payments",
        relatedLabel: "View Payments",
        generatedAt,
      };
    }

    if (includesAny(normalized, ["rent", "obligation", "balance", "due"])) {
      return {
        answer: `${obligations.length} Rent Obligation${obligations.length === 1 ? " is" : "s are"} visible. ${overdue.length} are overdue, ${dueSoon.length} are due soon or today, and the overdue outstanding balance is ${currencyFormatter.format(outstandingBalance)}.`,
        relatedHref: "/landlord/rent-monitoring",
        relatedLabel: "View Rent Monitoring",
        generatedAt,
      };
    }

    if (includesAny(normalized, ["today", "recap", "summary", "overview", "operations", "dashboard"])) {
      return {
        answer: `Operations recap:\n• ${tenants.length} visible Tenants; ${tenants.filter((item) => item.assignmentType !== null).length} assigned\n• ${overdue.length} overdue Rent Obligations; ${currencyFormatter.format(outstandingBalance)} outstanding\n• ${pendingPayments.length} Payments awaiting verification\n• ${openMaintenance.length} unresolved Maintenance Requests\n• ${unreadNotifications.length} unread Notifications`,
        relatedHref: "/landlord/dashboard",
        relatedLabel: "Open Dashboard",
        generatedAt,
      };
    }

    return {
      answer: "I’m scoped to RentSpace operations. I can explain your authorized Tenant, assignment, Rent Obligation, Payment, Maintenance, Message, and Notification records; recommend next steps; prioritize follow-ups; and draft Tenant messages for you to review. I can’t answer unrelated general questions or change records. Try asking “What should I prioritize today?” or “Help me message [Tenant name] about rent.”",
      generatedAt,
    };
  } catch {
    return {
      answer: "I couldn’t load all of your landlord data right now. Confirm the required Supabase migrations are installed, then try again.",
      generatedAt,
      error: true,
    };
  }
}