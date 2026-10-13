"use server";

import {
  generateRentSpaceAssistantReply,
  OpenAIConfigurationError,
  OpenAIRequestError,
  OpenRouterConfigurationError,
  OpenRouterRequestError,
  type RentSpaceAssistantProvider,
  type RentSpaceAssistantContext,
} from "@/lib/api/openai/rentspace-assistant";
import { requireFeatureAccess } from "@/lib/features/access";
import {
  getLandlordMaintenanceRequests,
  getLandlordNotifications,
  getLandlordPayments,
  getLandlordRentMonitoring,
  getLandlordTenants,
} from "@/lib/landlord/data";

export type AssistantReply = {
  answer: string;
  relatedHref?: string;
  relatedLabel?: string;
  generatedAt: string;
  error?: boolean;
  provider?: RentSpaceAssistantProvider;
};

/** Selects the most useful RentSpace page to show beside an AI response. */
function getRelatedPage(question: string) {
  const normalized = question.toLowerCase();

  if (/maintenance|repair|broken|issue/.test(normalized)) return { relatedHref: "/landlord/maintenance", relatedLabel: "View Maintenance" };
  if (/payment|gcash|cash|receipt|proof|collection/.test(normalized)) return { relatedHref: "/landlord/payments", relatedLabel: "View Payments" };
  if (/rent|overdue|balance|obligation|due date/.test(normalized)) return { relatedHref: "/landlord/rent-monitoring", relatedLabel: "View Rent Monitoring" };
  if (/message|contact|communicat|remind|draft/.test(normalized)) return { relatedHref: "/landlord/messages", relatedLabel: "Open Messages" };
  if (/notification|alert|unread/.test(normalized)) return { relatedHref: "/landlord/notifications", relatedLabel: "View Notifications" };
  if (/unit|room|bed|apartment|occupancy|available space/.test(normalized)) return { relatedHref: "/landlord/units", relatedLabel: "View Units" };
  if (/tenant|assignment|move in|move-in|move out|move-out/.test(normalized)) return { relatedHref: "/landlord/tenants", relatedLabel: "View Tenants" };
  if (/report|monthly summary|collection rate/.test(normalized)) return { relatedHref: "/landlord/reports", relatedLabel: "View Reports" };

  return { relatedHref: "/landlord/dashboard", relatedLabel: "Open Dashboard" };
}

/** Loads all operational records through the signed-in landlord's Supabase/RLS scope. */
async function loadAuthorizedLandlordRecords() {
  const [tenants, payments, maintenance, obligations, notifications] = await Promise.all([
    getLandlordTenants(),
    getLandlordPayments(),
    getLandlordMaintenanceRequests(),
    getLandlordRentMonitoring(),
    getLandlordNotifications(),
  ]);

  return { tenants, payments, maintenance, obligations, notifications };
}

/** Converts RLS-authorized landlord records into the limited context sent to OpenAI. */
function createAssistantContext(
  records: Awaited<ReturnType<typeof loadAuthorizedLandlordRecords>>,
): RentSpaceAssistantContext {
  const { tenants, payments, maintenance, obligations, notifications } = records;
  const overdueObligations = obligations.filter((item) => item.dueStatus === "overdue" && item.paymentStatus !== "paid" && item.balance > 0);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      tenants: tenants.length,
      approvedTenants: tenants.filter((item) => item.accountStatus === "approved").length,
      assignedTenants: tenants.filter((item) => item.assignmentType !== null).length,
      pendingTenantRegistrations: tenants.filter((item) => item.accountStatus === "pending").length,
      pendingPayments: payments.filter((item) => item.verificationStatus === "pending").length,
      openMaintenanceRequests: maintenance.filter((item) => item.status !== "resolved").length,
      overdueObligations: overdueObligations.length,
      overdueBalance: overdueObligations.reduce((sum, item) => sum + item.balance, 0),
      unreadNotifications: notifications.filter((item) => !item.isRead).length,
    },
    tenants: tenants.slice(0, 100).map((item) => ({
      name: `${item.firstName} ${item.lastName}`.trim(),
      accountStatus: item.accountStatus,
      assignmentType: item.assignmentType,
      unitName: item.unitName,
      roomNumber: item.roomNumber,
      bedLabel: item.bedLabel,
      moveInDate: item.moveInDate,
      rentDueDate: item.rentDueDate,
      monthlyRent: item.monthlyRent,
    })),
    rentObligations: obligations.slice(0, 150).map((item) => ({
      tenantName: item.tenantName,
      unitName: item.unitName,
      roomNumber: item.roomNumber,
      bedLabel: item.bedLabel,
      dueDate: item.dueDate,
      amountDue: item.amountDue,
      amountPaid: item.amountPaid,
      balance: item.balance,
      dueStatus: item.dueStatus,
      paymentStatus: item.paymentStatus,
    })),
    payments: payments.slice(0, 100).map((item) => ({
      tenantName: item.tenantName,
      unitName: item.unitName,
      paymentDate: item.paymentDate,
      amount: item.amount,
      paymentMethod: item.paymentMethod,
      verificationStatus: item.verificationStatus,
      rejectionReason: item.rejectionReason,
    })),
    maintenanceRequests: maintenance.slice(0, 100).map((item) => ({
      tenantName: item.tenantName,
      unitName: item.unitName,
      roomNumber: item.roomNumber,
      bedLabel: item.bedLabel,
      category: item.category,
      description: item.description,
      status: item.status,
      landlordNotes: item.landlordNotes,
      createdAt: item.createdAt,
    })),
    notifications: notifications.slice(0, 50).map((item) => ({
      title: item.title,
      message: item.message,
      isRead: item.isRead,
      createdAt: item.createdAt,
    })),
  };
}

/** Authorizes a landlord, loads permitted data, and requests a read-only AI answer. */
export async function askLandlordAssistant(rawQuestion: string, recentUserQuestions: string[] = []): Promise<AssistantReply> {
  const { profile } = await requireFeatureAccess("ai_assistant");
  const question = rawQuestion.trim();
  const generatedAt = new Date().toISOString();

  if (!question) return { answer: "Enter a question about your RentSpace operations.", generatedAt, error: true };
  if (question.length > 500) return { answer: "Please keep your question to 500 characters or fewer.", generatedAt, error: true };

  try {
    const records = await loadAuthorizedLandlordRecords();
    const context = createAssistantContext(records);
    const result = await generateRentSpaceAssistantReply({
      question,
      recentUserQuestions: recentUserQuestions.slice(-3),
      context,
      safetyIdentifier: profile.id,
    });

    return { answer: result.answer, provider: result.provider, ...getRelatedPage(question), generatedAt };
  } catch (error) {
    if (error instanceof OpenRouterConfigurationError) {
      console.error("OpenRouter fallback is not configured for free-only use.");
      return {
        answer: "RentSpace Assistant is not configured yet. Please contact the system administrator.",
        generatedAt,
        error: true,
      };
    }

    if (error instanceof OpenRouterRequestError) {
      console.error("OpenRouter assistant fallback failed:", { status: error.status, code: error.code, requestId: error.requestId });
      return {
        answer: error.status === 429
          ? "RentSpace Assistant has reached its free AI usage limit. Please try again later."
          : "RentSpace Assistant could not connect to either AI service right now. Please try again shortly.",
        generatedAt,
        error: true,
      };
    }

    if (error instanceof OpenAIConfigurationError) {
      return {
        answer: "RentSpace Assistant is not configured yet. Please contact the system administrator.",
        generatedAt,
        error: true,
      };
    }

    if (error instanceof OpenAIRequestError) {
      console.error("OpenAI assistant request failed:", { status: error.status, code: error.code, requestId: error.requestId });

      if (["insufficient_quota", "credit_balance_exhausted"].includes(error.code ?? "")) {
        return {
          answer: "RentSpace Assistant is temporarily unavailable because its AI service credits have been exhausted. Please contact the system administrator to restore API billing, then try again.",
          generatedAt,
          error: true,
        };
      }

      if (error.status === 401 || error.status === 403) {
        return {
          answer: "RentSpace Assistant cannot connect because its AI service credentials are invalid or unauthorized. Please contact the system administrator.",
          generatedAt,
          error: true,
        };
      }

      if (error.status === 429) {
        return {
          answer: "RentSpace Assistant is receiving too many requests right now. Please wait a moment and try again.",
          generatedAt,
          error: true,
        };
      }

      return {
        answer: "RentSpace Assistant could not complete the request right now. Please try again shortly or ask a more focused RentSpace question.",
        generatedAt,
        error: true,
      };
    }

    console.error("RentSpace assistant failed before receiving an OpenAI response:", error);
    return {
      answer: "I couldn’t load the required RentSpace data right now. Please try again shortly.",
      generatedAt,
      error: true,
    };
  }
}