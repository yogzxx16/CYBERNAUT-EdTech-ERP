import { ApiError } from "../../../utils/apiError";
import { clearPermissionCache } from "../../../middlewares/permission.middleware";
import { roleRepository } from "./role.repository";
import { toRoleDTO } from "./role.dto";
import type { UpdateRoleInput } from "./role.validator";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_GROUPS } from "../../../config/permissions";
import { ROLE_LIST, type Role } from "../../../config/constants";

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  employee: "Employee",
  intern: "Intern",
};

export const roleService = {
  async ensureSystemRoles() {
    for (const slug of ROLE_LIST) {
      const existing = await roleRepository.findBySlug(slug);
      if (!existing) {
        await roleRepository.upsertBySlug(slug, {
          name: ROLE_LABELS[slug],
          description: `${ROLE_LABELS[slug]} system role`,
          permissions: DEFAULT_ROLE_PERMISSIONS[slug] ?? [],
          status: "active",
          system: true,
        });
      }
    }
  },

  async list() {
    const items = await roleRepository.list();
    return items.map(toRoleDTO);
  },

  async update(id: string, input: UpdateRoleInput) {
    const existing = await roleRepository.findById(id);
    if (!existing) throw ApiError.notFound("Role not found");
    if (existing.slug === "super_admin" && input.permissions) {
      throw ApiError.forbidden("Super Admin permissions cannot be modified");
    }
    const doc = await roleRepository.update(id, input as never);
    clearPermissionCache(existing.slug);
    return toRoleDTO(doc!);
  },

  permissionCatalog() {
    return PERMISSION_GROUPS;
  },
};
