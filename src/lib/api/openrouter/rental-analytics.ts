import "server-only";

import type { RentalAnalyticsSnapshot } from "@/lib/landlord/rental-analytics";

import { createOpenRouterTextResponse } from "./client";

const RENTAL_ANALYTICS_INSTRUCTIONS = `You are the AI interpretation layer for RentSpace AI Rental Analytics.

Use only the verified aggregate metrics supplied by RentSpace. Do not invent causes, tenants, amounts, dates, forecasts, or actions already completed.
Write a concise portfolio briefing with exactly these headings: Portfolio health, Priority risks, Recommended actions.
Under each heading, use 1 to 3 short bullet points. Refer to Philippine pesos as PHP. Distinguish observations from recommendations.
You are read-only and must never claim to have changed a RentSpace record.`;

/** Interprets deterministic rental metrics without sending tenant identities or raw descriptions. */
export async function generateRentalAnalyticsInsights(snapshot: RentalAnalyticsSnapshot) {
  const aggregateContext = {
    generatedAt: snapshot.generatedAt,
    currentMonth: snapshot.currentMonthLabel,
    metrics: {
      expectedRent: snapshot.expectedRent,
      collectedRent: snapshot.collectedRent,
      outstandingBalance: snapshot.outstandingBalance,
      collectionRate: snapshot.collectionRate,
      occupancyRate: snapshot.occupancyRate,
      occupiedSpaces: snapshot.occupiedSpaces,
      availableSpaces: snapshot.availableSpaces,
      overdueTenants: snapshot.overdueTenants,
      pendingPayments: snapshot.pendingPayments,
      openMaintenanceRequests: snapshot.openMaintenanceRequests,
      averageResolutionDays: snapshot.averageResolutionDays,
      maintenanceCreatedThisMonth: snapshot.maintenanceCreatedThisMonth,
      maintenanceResolvedThisMonth: snapshot.maintenanceResolvedThisMonth,
    },
    sixMonthTrend: snapshot.trends,
    oldestOpenMaintenanceAgeDays: snapshot.maintenanceRisks[0]?.ageDays ?? null,
    largestOverdueBalance: snapshot.overdueRecords[0]?.balance ?? 0,
  };

  return createOpenRouterTextResponse({
    instructions: RENTAL_ANALYTICS_INSTRUCTIONS,
    input: JSON.stringify({ verifiedRentSpaceAnalytics: aggregateContext }),
    maxOutputTokens: 500,
  });
}