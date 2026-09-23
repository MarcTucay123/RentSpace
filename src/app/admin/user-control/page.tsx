import { FeatureToggle } from "@/components/admin/feature-toggle";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { FilterNavigation } from "@/components/ui/filter-navigation";
import { ListSearchForm } from "@/components/ui/list-search-form";
import type { Profile } from "@/lib/auth/types";
import { requireAdminAccess } from "@/lib/auth/utils";
import { getFeaturesForRole } from "@/lib/features/config";
import { createClient } from "@/utils/supabase/server";

export const metadata = { title: "User Control | RentSpace" };

type UserControlPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UserControlPage({ searchParams }: UserControlPageProps) {
  await requireAdminAccess();
  const [params, supabase] = await Promise.all([searchParams, createClient()]);
  const [{ data: userRows, error: usersError }, { data: controlRows, error: controlsError }] = await Promise.all([
    supabase
      .from("users")
      .select("id, first_name, middle_name, last_name, mobile_number, email, role, account_status, profile_photo_url, created_at, updated_at")
      .in("role", ["landlord", "tenant"])
      .order("first_name"),
    supabase.from("user_feature_controls").select("profile_id, feature_key, enabled"),
  ]);

  if (usersError || controlsError) throw new Error("Unable to load user feature controls.");

  const users = (userRows ?? []) as Profile[];
  const requestedRole = typeof params.role === "string" ? params.role : "all";
  const selectedRole = ["all", "landlord", "tenant"].includes(requestedRole) ? requestedRole : "all";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const normalizedQuery = query.toLocaleLowerCase();
  const disabledFeatures = new Set(
    (controlRows ?? []).filter((control) => !control.enabled).map((control) => `${control.profile_id}:${control.feature_key}`),
  );
  const filteredUsers = users.filter((user) => {
    const searchable = [user.first_name, user.middle_name, user.last_name, user.email].filter(Boolean).join(" ").toLocaleLowerCase();
    return (selectedRole === "all" || user.role === selectedRole) && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
  const searchSuggestions = Array.from(new Set(users.flatMap((user) => [
    `${user.first_name} ${user.middle_name ?? ""} ${user.last_name}`.replace(/\s+/g, " ").trim(),
    user.email,
  ].filter((value): value is string => Boolean(value)))));

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Administration</p>
        <h1 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">User Control</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-dormmate-muted)]">
          Turn individual Landlord and Tenant modules on or off. Disabled modules disappear from that user&apos;s side panel and direct page access is blocked. Dashboard and Profile Settings always remain available.
        </p>
      </section>

      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <ListSearchForm basePath="/admin/user-control" query={query} selectedFilter={selectedRole} label="Search controlled users" placeholder="Search name or email" suggestions={searchSuggestions} />
        <div className="mt-4">
          <FilterNavigation
            basePath="/admin/user-control"
            selected={selectedRole}
            preservedParams={query ? { q: query } : {}}
            label="Filter controlled users"
            options={[
              { value: "all", label: "All", count: users.length },
              { value: "landlord", label: "Landlords", count: users.filter((user) => user.role === "landlord").length },
              { value: "tenant", label: "Tenants", count: users.filter((user) => user.role === "tenant").length },
            ]}
          />
        </div>

        <div className="mt-5 space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-[var(--color-dormmate-border)] p-5 text-sm text-[var(--color-dormmate-muted)]">No user accounts match this filter.</div>
          ) : filteredUsers.map((user) => {
            const name = `${user.first_name} ${user.middle_name ?? ""} ${user.last_name}`.replace(/\s+/g, " ").trim();
            const features = getFeaturesForRole(user.role);
            return (
              <article key={user.id} className="rounded-[1.1rem] border border-[var(--color-dormmate-border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProfileAvatar photoUrl={user.profile_photo_url} name={name} assignmentLabel={`${user.role} account`} assignmentPrefix="Account" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--color-dormmate-text-strong)]">{name}</p>
                      <p className="truncate text-xs text-[var(--color-dormmate-muted)]">{user.email ?? "No email"}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#e7f0ee] px-3 py-1 text-xs font-semibold capitalize text-[#315a57]">{user.role}</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {features.map((feature) => {
                    const enabled = !disabledFeatures.has(`${user.id}:${feature.key}`);
                    return (
                      <div key={feature.key} className="rounded-[14px] bg-[var(--color-dormmate-surface)] p-3">
                        <p className="mb-2 text-sm font-semibold text-[var(--color-dormmate-text-strong)]">{feature.label}</p>
                        <FeatureToggle profileId={user.id} featureKey={feature.key} enabled={enabled} />
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}