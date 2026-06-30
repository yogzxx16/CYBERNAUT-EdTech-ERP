import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { roleRepository } from "../modules/organization/roles/role.repository";
import type { PermissionKey } from "../config/permissions";
import { ROLES } from "../config/constants";

const cache = new Map<string, { perms: Set<string>; at: number }>();
const TTL = 30 * 1000;

async function permsFor(roleSlug: string): Promise<Set<string>> {
  const hit = cache.get(roleSlug);
  if (hit && Date.now() - hit.at < TTL) return hit.perms;
  const doc = await roleRepository.findBySlug(roleSlug);
  const perms = new Set<string>(doc?.permissions ?? []);
  cache.set(roleSlug, { perms, at: Date.now() });
  return perms;
}

export function clearPermissionCache(roleSlug?: string) {
  if (roleSlug) cache.delete(roleSlug);
  else cache.clear();
}

export function requirePermission(...perms: PermissionKey[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === ROLES.SUPER_ADMIN) return next();
    try {
      const granted = await permsFor(req.user.role);
      const ok = perms.every((p) => granted.has(p));
      if (!ok) return next(ApiError.forbidden("Insufficient permissions"));
      return next();
    } catch (e) {
      return next(e);
    }
  };
}
