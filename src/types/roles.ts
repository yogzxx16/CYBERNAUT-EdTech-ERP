export type Role = "super_admin" | "admin" | "employee" | "intern";

export const ROLES: Record<Role, { label: string; weight: number }> = {
  super_admin: { label: "Super Admin", weight: 4 },
  admin: { label: "Admin", weight: 3 },
  employee: { label: "Employee", weight: 2 },
  intern: { label: "Intern", weight: 1 },
};

export interface AuthUser {
  id: string;
  fullName?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  profileImage?: string;
  forcePasswordChange?: boolean;
}
