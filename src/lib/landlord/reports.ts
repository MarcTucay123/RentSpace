import {
  getLandlordMaintenanceRequests,
  getLandlordPayments,
  getLandlordRentMonitoring,
  getLandlordTenants,
} from "@/lib/landlord/data";

export function getReportMonth(value?: string | null) {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getReportMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function belongsToMonth(value: string, month: string) {
  return value.slice(0, 7) === month;
}

export async function getLandlordMonthlyReport(requestedMonth?: string | null) {
  const month = getReportMonth(requestedMonth);
  const [tenants, payments, maintenance, obligations] = await Promise.all([
    getLandlordTenants(),
    getLandlordPayments(),
    getLandlordMaintenanceRequests(),
    getLandlordRentMonitoring(),
  ]);

  const verifiedPaymentMethodsByObligation = new Map<string, Set<string>>();
  payments.filter((item) => item.verificationStatus === "verified").forEach((item) => {
    const methods = verifiedPaymentMethodsByObligation.get(item.rentalObligationId) ?? new Set<string>();
    methods.add(item.paymentMethod.toUpperCase());
    verifiedPaymentMethodsByObligation.set(item.rentalObligationId, methods);
  });
  const monthlyObligations = obligations
    .filter((item) => belongsToMonth(item.dueDate, month))
    .map((item) => ({
      ...item,
      paymentMethod: item.paymentStatus === "paid"
        ? Array.from(verifiedPaymentMethodsByObligation.get(item.rentalObligationId) ?? []).join(" / ") || "Not recorded"
        : null,
    }));
  const monthlyObligationIds = new Set(monthlyObligations.map((item) => item.rentalObligationId));
  const monthlyActivityPayments = payments.filter((item) => belongsToMonth(item.paymentDate, month));
  const reportPayments = payments.filter(
    (item) => belongsToMonth(item.paymentDate, month) || monthlyObligationIds.has(item.rentalObligationId),
  );
  const monthlyMaintenance = maintenance.filter((item) => belongsToMonth(item.createdAt, month));
  const totalAmountDue = monthlyObligations.reduce((sum, item) => sum + item.amountDue, 0);
  const totalAmountPaid = monthlyObligations.reduce((sum, item) => sum + item.amountPaid, 0);
  const outstandingBalance = monthlyObligations.reduce((sum, item) => sum + item.balance, 0);
  const assignedTenantsCount = tenants.filter((item) => item.assignmentType !== null).length;

  return {
    month,
    monthLabel: getReportMonthLabel(month),
    payments: reportPayments,
    maintenance: monthlyMaintenance,
    obligations: monthlyObligations,
    summary: {
      tenantsCount: tenants.length,
      assignedTenantsCount,
      occupancyRate: tenants.length > 0 ? Math.round((assignedTenantsCount / tenants.length) * 100) : 0,
      collectionRate: totalAmountDue > 0 ? Math.round((totalAmountPaid / totalAmountDue) * 100) : 0,
      obligationsCount: monthlyObligations.length,
      paidObligationsCount: monthlyObligations.filter((item) => item.paymentStatus === "paid").length,
      overdueObligationsCount: monthlyObligations.filter((item) => item.dueStatus === "overdue" && item.paymentStatus !== "paid").length,
      paymentsCount: monthlyActivityPayments.length,
      verifiedPaymentsCount: monthlyActivityPayments.filter((item) => item.verificationStatus === "verified").length,
      pendingPaymentsCount: monthlyActivityPayments.filter((item) => item.verificationStatus === "pending").length,
      maintenanceCount: monthlyMaintenance.length,
      pendingMaintenanceCount: monthlyMaintenance.filter((item) => item.status !== "resolved").length,
      totalAmountDue,
      totalAmountPaid,
      outstandingBalance,
    },
  };
}