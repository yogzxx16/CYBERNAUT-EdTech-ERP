import type { Role } from "../../../config/constants";

export interface AuthUserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  forcePasswordChange?: boolean;
  profileImage?: string;
  createdAt: string;
}

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthSessionDTO {
  user: AuthUserDTO;
  tokens: AuthTokensDTO;
}
