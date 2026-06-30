import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import type { Role } from "../config/constants";

/** Authorization gate — requires an authenticated user. */
export function authorize(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  return next();
}

/** RBAC gate — requires one of the listed roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden("Insufficient role"));
    return next();
  };
}
