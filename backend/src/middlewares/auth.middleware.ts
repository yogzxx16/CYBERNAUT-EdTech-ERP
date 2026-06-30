import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { jwtUtil } from "../utils/jwt.util";
import { COOKIE_NAMES } from "../config/constants";

function extractAccessToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractAccessToken(req);
  if (!token) return next(ApiError.unauthorized("Missing access token"));
  try {
    const payload = jwtUtil.verifyAccess(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(ApiError.unauthorized("Invalid or expired access token"));
  }
}

/** Extract refresh token from httpOnly cookie or body. */
export function getRefreshToken(req: Request): string | null {
  const cookieToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
  if (typeof cookieToken === "string" && cookieToken.length > 0) return cookieToken;
  const body = req.body as { refreshToken?: unknown } | undefined;
  if (body && typeof body.refreshToken === "string") return body.refreshToken;
  return null;
}
