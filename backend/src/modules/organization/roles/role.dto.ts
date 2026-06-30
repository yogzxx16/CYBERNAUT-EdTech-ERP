import type { RoleDoc } from "./role.repository";

export interface RoleDTO {
  id: string;
  slug: string;
  name: string;
  description?: string;
  permissions: string[];
  status: string;
  system: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toRoleDTO(r: RoleDoc): RoleDTO {
  return {
    id: r._id.toString(),
    slug: r.slug,
    name: r.name,
    description: r.description,
    permissions: r.permissions,
    status: r.status,
    system: r.system,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
