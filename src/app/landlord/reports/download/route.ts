import { requireLandlordAccess } from "@/lib/auth/utils";
import { getLandlordMonthlyReport } from "@/lib/landlord/reports";

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function csvRow(values: Array<string | number | null | undefined>) {
  return values.map(csvCell).join(",");
}

function formatLocation(item: { unitName: string | null; roomNumber: string | null; bedLabel: string | null }) {
  return [item.unitName, item.roomNumber ? `Room: ${item.roomNumber}` : null, item.bedLabel].filter(Boolean).join(" • ") || "No assignment";
}

export async function GET(request: Request) {
  const { profile } = await requireLandlordAccess();
  const month = new URL(request.url).searchParams.get("month");
  const report = await getLandlordMonthlyReport(month);
  const { summary } = report;
  const generatedAt = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date());

  const rows = [
    csvRow(["Lady D's Dormitory and Apartment"]),
    csvRow(["Monthly Landlord Report", report.monthLabel]),
    csvRow(["Prepared for", `${profile.first_name} ${profile.last_name}`.trim()]),
    csvRow(["Generated", generatedAt]),
    "",
    csvRow(["SUMMARY"]),
    csvRow(["Metric", "Value"]),
    csvRow(["Current tenants", summary.tenantsCount]),
    csvRow(["Currently assigned tenants", summary.assignedTenantsCount]),
    csvRow(["Current occupancy rate", `${summary.occupancyRate}%`]),
    csvRow(["Monthly collection rate", `${summary.collectionRate}%`]),
    csvRow(["Monthly amount due", summary.totalAmountDue]),
    csvRow(["Monthly amount paid", summary.totalAmountPaid]),
    csvRow(["Monthly outstanding balance", summary.outstandingBalance]),
    csvRow(["Monthly obligations", summary.obligationsCount]),
    csvRow(["Paid obligations", summary.paidObligationsCount]),
    csvRow(["Overdue obligations", summary.overdueObligationsCount]),
    csvRow(["Payments recorded", summary.paymentsCount]),
    csvRow(["Verified payments", summary.verifiedPaymentsCount]),
    csvRow(["Pending payments", summary.pendingPaymentsCount]),
    csvRow(["Maintenance requests", summary.maintenanceCount]),
    csvRow(["Open maintenance", summary.pendingMaintenanceCount]),
    "",
    csvRow(["RENT LEDGER"]),
    csvRow(["Tenant", "Assigned To", "Due Date", "Amount Due", "Amount Paid", "Balance", "Payment Method", "Due Status", "Payment Status"]),
    ...report.obligations.map((item) => csvRow([item.tenantName, formatLocation(item), item.dueDate, item.amountDue, item.amountPaid, item.balance, item.paymentMethod ?? "", item.dueStatus.replaceAll("_", " "), item.paymentStatus.replaceAll("_", " ")])),
    "",
    csvRow(["PAYMENTS"]),
    csvRow(["Tenant", "Assigned To", "Payment Date", "Amount", "Method", "Verification", "Rent Status"]),
    ...report.payments.map((item) => csvRow([item.tenantName, formatLocation(item), item.paymentDate, item.amount, item.paymentMethod, item.verificationStatus, item.paymentStatus.replaceAll("_", " ")])),
    "",
    csvRow(["MAINTENANCE"]),
    csvRow(["Tenant", "Assigned To", "Date Submitted", "Category", "Status", "Description"]),
    ...report.maintenance.map((item) => csvRow([item.tenantName, formatLocation(item), item.createdAt.slice(0, 10), item.category, item.status.replaceAll("_", " "), item.description])),
  ];

  return new Response(`\uFEFF${rows.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lady-d-monthly-report-${report.month}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}