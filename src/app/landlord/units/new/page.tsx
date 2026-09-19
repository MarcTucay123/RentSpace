import { UnitCreateForm } from "@/components/units/unit-create-form";
import { requireLandlordAccess } from "@/lib/auth/utils";

export const metadata = {
  title: "Add Unit | RentSpace",
};

export default async function NewUnitPage() {
  await requireLandlordAccess();

  return <UnitCreateForm />;
}