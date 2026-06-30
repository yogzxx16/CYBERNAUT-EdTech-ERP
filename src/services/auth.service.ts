import { api, unwrap, type ApiEnvelope } from "./api";
import type { AuthUser, Role } from "@/types/roles";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
}

interface BackendAuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    forcePasswordChange?: boolean;
    profileImage?: string;
    createdAt: string;
  };
  tokens: AuthTokens;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    const res = await api.post<ApiEnvelope<BackendAuthSession>>("/auth/login", { email, password });
    return unwrap(res.data);
  },
  async logout(): Promise<void> {
    await api.post("/auth/logout", {});
  },
  async me(): Promise<AuthUser> {
    const res = await api.get<ApiEnvelope<{ user: AuthUser }>>("/auth/me");
    return res.data.data.user;
  },
  async forgotPassword(email: string): Promise<{ resetToken?: string }> {
    const res = await api.post<ApiEnvelope<{ resetToken?: string }>>("/auth/forgot-password", { email });
    return unwrap(res.data);
  },
  async resetPassword(token: string, password: string): Promise<void> {
    await api.post("/auth/reset-password", { token, password });
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post("/auth/change-password", { currentPassword, newPassword });
  },
};
