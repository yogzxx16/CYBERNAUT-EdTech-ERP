import { api, unwrap, type ApiEnvelope } from "./api";
import type { PaginatedResponse } from "./departments.service";

export interface AppRole {
  id: string;
  slug: "super_admin" | "admin" | "employee" | "intern";
  name: string;
  description?: string;
  permissions: string[];
  status: "active" | "inactive";
  system: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PermissionCatalog = Record<string, string[]>;

export const rolesApi = {
  async list() {
    const res = await api.get<PaginatedResponse<AppRole>>("/roles");
    return res.data.data;
  },
  async permissions() {
    const res = await api.get<ApiEnvelope<PermissionCatalog>>("/roles/permissions");
    return unwrap(res.data);
  },
  async update(
    id: string,
    input: Partial<{
      name: string;
      description: string;
      status: "active" | "inactive";
      permissions: string[];
    }>,
  ) {
    const res = await api.patch<ApiEnvelope<AppRole>>(`/roles/${id}`, input);
    return unwrap(res.data);
  },
};
