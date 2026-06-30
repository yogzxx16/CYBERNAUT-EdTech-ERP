import { z } from "zod";
import { ROLE_LIST } from "../../../config/constants";
import { ALL_PERMISSIONS } from "../../../config/permissions";

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(300).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).optional(),
});

export const roleSlugParamSchema = z.object({
  slug: z.enum(ROLE_LIST as [string, ...string[]]),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
