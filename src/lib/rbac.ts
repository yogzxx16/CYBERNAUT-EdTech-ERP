import type { Role } from "@/types/roles";

export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/dashboard": ["super_admin", "admin", "employee", "intern"],
  "/departments": ["super_admin", "admin"],
  "/users": ["super_admin", "admin"],
  "/roles": ["super_admin"],
  "/projects": ["super_admin", "admin", "employee", "intern"],
  "/tasks": ["super_admin", "admin", "employee", "intern"],
  "/announcements": ["super_admin", "admin", "employee", "intern"],
  "/discussions": ["super_admin", "admin", "employee", "intern"],
  "/events": ["super_admin", "admin", "employee", "intern"],
  "/leave-requests": ["super_admin", "admin", "employee", "intern"],
  "/attendance": ["super_admin", "admin", "employee", "intern"],
  "/salary-slips": ["super_admin", "admin", "employee"],
  "/support": ["super_admin", "admin", "employee", "intern"],
  "/audit-logs": ["super_admin"],
  "/profile": ["super_admin", "admin", "employee", "intern"],
};

export function canAccess(path: string, role: Role | undefined): boolean {
  if (!role) return false;
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return true;
  return allowed.includes(role);
}
