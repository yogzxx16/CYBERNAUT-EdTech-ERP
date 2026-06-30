import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { authService } from "../services/auth.service";
import { getRefreshToken } from "../../../middlewares/auth.middleware";
import { COOKIE_NAMES } from "../../../config/constants";
import { config } from "../../../config";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "../validators/auth.validator";

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.security.cookieSecure,
    path: "/",
    // 30d cookie cap; the JWT itself dictates real lifetime.
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: "/" });
}

export const authController = {
  async register(req: Request, res: Response) {
    const session = await authService.register(req.body as RegisterInput);
    setRefreshCookie(res, session.tokens.refreshToken);
    return ApiResponse.created(res, session, "Account created");
  },

  async login(req: Request, res: Response) {
    const session = await authService.login(req.body as LoginInput);
    setRefreshCookie(res, session.tokens.refreshToken);
    return ApiResponse.ok(res, session, "Signed in");
  },

  async refresh(req: Request, res: Response) {
    const token = getRefreshToken(req);
    const tokens = await authService.refresh(token ?? "");
    setRefreshCookie(res, tokens.refreshToken);
    return ApiResponse.ok(res, { tokens }, "Token refreshed");
  },

  async logout(req: Request, res: Response) {
    const token = getRefreshToken(req);
    await authService.logout(token);
    clearRefreshCookie(res);
    return ApiResponse.ok(res, null, "Signed out");
  },

  async forgotPassword(req: Request, res: Response) {
    const result = await authService.forgotPassword(req.body as ForgotPasswordInput);
    return ApiResponse.ok(res, result, "If the account exists, a reset link has been sent");
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body as ResetPasswordInput);
    return ApiResponse.ok(res, null, "Password reset successful");
  },

  async changePassword(req: Request, res: Response) {
    await authService.changePassword(req.user!.id, req.body as ChangePasswordInput);
    return ApiResponse.ok(res, null, "Password changed");
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(req.user!.id);
    return ApiResponse.ok(res, { user }, "OK");
  },
};
