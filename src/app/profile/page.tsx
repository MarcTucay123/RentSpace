import { ProfileSettingsPage } from "@/components/profile/profile-settings-page";
import { requireAuthenticatedProfile } from "@/lib/auth/utils";
import { getTenantAssignmentSummary } from "@/lib/tenant/data";

export const metadata = {
  title: "Profile Settings | RentSpace",
};

export default async function ProfilePage() {
  const { profile } = await requireAuthenticatedProfile();
  const assignment = profile.role === "tenant" ? await getTenantAssignmentSummary(profile.id) : null;
  const assignmentLabel = !assignment?.unitName
    ? null
    : assignment.assignmentType === "bed_space"
      ? `${assignment.unitName} • Room: ${assignment.roomNumber ?? "—"} • ${assignment.bedLabel ?? "Bed space"}`
      : assignment.assignmentType === "room_space"
        ? `${assignment.unitName} • Room: ${assignment.roomNumber ?? "—"}`
        : assignment.unitName;

  return <ProfileSettingsPage profile={profile} assignmentLabel={assignmentLabel} />;
}