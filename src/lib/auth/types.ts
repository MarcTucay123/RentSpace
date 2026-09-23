export type UserRole = "admin" | "landlord" | "tenant";

export type AccountStatus = "pending" | "approved" | "rejected" | "inactive";

export type Profile = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  mobile_number: string;
  email: string | null;
  role: UserRole;
  account_status: AccountStatus;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantProfile = {
  id: string;
  profile_id: string;
  property_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  address: string | null;
  notes: string | null;
  contract_reference: string | null;
  move_in_date: string | null;
  created_at: string;
  updated_at: string;
};

export type RegistrationPropertyOption = {
  id: string;
  property_name: string;
  address: string | null;
};

export type AuthFormState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export type ProfileFormState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  pendingEmail?: string;
};

export type RegistrationRole = "admin" | "landlord" | "tenant";