import { notFound } from "next/navigation";

import { UnitDetailsPage } from "@/components/units/unit-details-page";
import { requireLandlordAccess } from "@/lib/auth/utils";
import { getUnitById } from "@/lib/units/data";

export const metadata = {
  title: "Manage Unit | RentSpace",
};

type UnitDetailsRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function LandlordUnitDetailsPage({ params }: UnitDetailsRouteProps) {
  await requireLandlordAccess();
  const { id } = await params;
  const unit = await getUnitById(id);

  if (!unit) {
    notFound();
  }

  return <UnitDetailsPage unit={unit} />;
}