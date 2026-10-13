import "server-only";

import {
  getLandlordMaintenanceRequests,
  getLandlordPayments,
  getLandlordRentMonitoring,
} from "@/lib/landlord/data";
import { getUnitsWithStructure } from "@/lib/units/data";

export type RentalAnalyticsTrend = {
  month: string;
  label: string;
  amountDue: number;
  amountCollected: number;
  outstandingBalance: number;
  collectionRate: number;
};

export type RentalAnalyticsSnapshot = {
  generatedAt: string;
  currentMonth: string;
  currentMonthLabel: string;
  expectedRent: number;
  collectedRent: number;
  outstandingBalance: number;
  collectionRate: number;
  occupancyRate: number;
  occupiedSpaces: number;
  availableSpaces: number;
  totalActiveSpaces: number;
  overdueTenants: number;
  pendingPayments: number;
  openMaintenanceRequests: number;
  averageResolutionDays: number | null;
  maintenanceCreatedThisMonth: number;
  maintenanceResolvedThisMonth: number;
  trends: RentalAnalyticsTrend[];
  overdueRecords: Array<{
    rentalObligationId: string;
    tenantName: string;
    location: string;
    dueDate: string;
    balance: number;
  }>;
  maintenanceRisks: Array<{
    id: string;
    category: string;
    tenantName: string;
    location: string;
    status: string;
    ageDays: number;
  }>;
};

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function getLocation(item: { unitName: string | null; roomNumber: string | null; bedLabel: string | null }) {
  return [item.unitName, item.roomNumber ? `Room ${item.roomNumber}` : null, item.bedLabel]
    .filter(Boolean)
    .join(" · ") || "Location not set";
}

function differenceInDays(laterValue: string | Date, earlierValue: string | Date) {
  const milliseconds = new Date(laterValue).getTime() - new Date(earlierValue).getTime();
  return Math.max(Math.round(milliseconds / 86_400_000), 0);
}

/** Calculates landlord analytics from RLS-authorized operational records. */
export async function getLandlordRentalAnalytics(): Promise<RentalAnalyticsSnapshot> {
  const [obligations, payments, maintenance, units] = await Promise.all([
    getLandlordRentMonitoring(),
    getLandlordPayments(),
    getLandlordMaintenanceRequests(),
    getUnitsWithStructure(),
  ]);
  const now = new Date();
  const currentMonth = getMonthKey(now);
  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return getMonthKey(date);
  });

  const trends = monthKeys.map<RentalAnalyticsTrend>((month) => {
    const monthlyObligations = obligations.filter((item) => item.dueDate.slice(0, 7) === month);
    const amountDue = monthlyObligations.reduce((sum, item) => sum + item.amountDue, 0);
    const amountCollected = monthlyObligations.reduce((sum, item) => sum + item.amountPaid, 0);
    const outstandingBalance = monthlyObligations.reduce((sum, item) => sum + item.balance, 0);

    return {
      month,
      label: getMonthLabel(month),
      amountDue,
      amountCollected,
      outstandingBalance,
      collectionRate: amountDue > 0 ? Math.min(Math.round((amountCollected / amountDue) * 100), 100) : 0,
    };
  });
  const currentTrend = trends.at(-1) ?? {
    month: currentMonth,
    label: getMonthLabel(currentMonth),
    amountDue: 0,
    amountCollected: 0,
    outstandingBalance: 0,
    collectionRate: 0,
  };

  const activeUnits = units.filter((unit) => unit.status === "active");
  const spaces = activeUnits.reduce((totals, unit) => {
    if (unit.unit_category === "apartment") {
      totals.capacity += 1;
      totals.occupied += unit.apartment_is_occupied ? 1 : 0;
    } else if (unit.unit_category === "room_space") {
      const activeRooms = unit.rooms.filter((room) => room.status === "active");
      totals.capacity += activeRooms.length;
      totals.occupied += activeRooms.filter((room) => unit.occupied_room_ids.includes(room.id)).length;
    } else {
      const activeBeds = unit.bed_spaces.filter((bed) => {
        const room = unit.rooms.find((item) => item.id === bed.room_id);
        return bed.status !== "inactive" && room?.status === "active";
      });
      totals.capacity += activeBeds.length;
      totals.occupied += activeBeds.filter((bed) => unit.occupied_bed_space_ids.includes(bed.id)).length;
    }
    return totals;
  }, { capacity: 0, occupied: 0 });
  const occupiedSpaces = Math.min(spaces.occupied, spaces.capacity);

  const overdueObligations = obligations
    .filter((item) => item.dueStatus === "overdue" && item.paymentStatus !== "paid" && item.balance > 0);
  const overdueRecords = overdueObligations
    .sort((a, b) => b.balance - a.balance || a.dueDate.localeCompare(b.dueDate))
    .map((item) => ({
      rentalObligationId: item.rentalObligationId,
      tenantName: item.tenantName,
      location: getLocation(item),
      dueDate: item.dueDate,
      balance: item.balance,
    }));

  const openMaintenance = maintenance.filter((item) => item.status !== "resolved");
  const maintenanceRisks = openMaintenance
    .map((item) => ({
      id: item.id,
      category: item.category,
      tenantName: item.tenantName,
      location: getLocation(item),
      status: item.status,
      ageDays: differenceInDays(now, item.createdAt),
    }))
    .sort((a, b) => b.ageDays - a.ageDays);
  const resolvedMaintenance = maintenance.filter((item) => item.status === "resolved");
  const averageResolutionDays = resolvedMaintenance.length > 0
    ? Math.round((resolvedMaintenance.reduce((sum, item) => sum + differenceInDays(item.updatedAt, item.createdAt), 0) / resolvedMaintenance.length) * 10) / 10
    : null;

  return {
    generatedAt: now.toISOString(),
    currentMonth,
    currentMonthLabel: getMonthLabel(currentMonth),
    expectedRent: currentTrend.amountDue,
    collectedRent: currentTrend.amountCollected,
    outstandingBalance: currentTrend.outstandingBalance,
    collectionRate: currentTrend.collectionRate,
    occupancyRate: spaces.capacity > 0 ? Math.round((occupiedSpaces / spaces.capacity) * 100) : 0,
    occupiedSpaces,
    availableSpaces: Math.max(spaces.capacity - occupiedSpaces, 0),
    totalActiveSpaces: spaces.capacity,
    overdueTenants: new Set(overdueObligations.map((item) => item.tenantProfileId)).size,
    pendingPayments: payments.filter((item) => item.verificationStatus === "pending").length,
    openMaintenanceRequests: openMaintenance.length,
    averageResolutionDays,
    maintenanceCreatedThisMonth: maintenance.filter((item) => item.createdAt.slice(0, 7) === currentMonth).length,
    maintenanceResolvedThisMonth: maintenance.filter((item) => item.status === "resolved" && item.updatedAt.slice(0, 7) === currentMonth).length,
    trends,
    overdueRecords,
    maintenanceRisks,
  };
}