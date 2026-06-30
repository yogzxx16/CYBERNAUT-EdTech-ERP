import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import { config } from "../config";
import type { Role } from "../config/constants";
import { TOKEN_TYPES, type TokenType } from "../config/constants";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: Role;
  type: typeof TOKEN_TYPES.ACCESS;
}
export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  type: typeof TOKEN_TYPES.REFRESH;
  jti: string;
}

export const jwtUtil = {
  signAccess(payload: { userId: string; role: Role }): string {
    const opts: SignOptions = { expiresIn: config.jwt.accessExpiresIn as SignOptions["expiresIn"] };
    return jwt.sign(
      { sub: payload.userId, role: payload.role, type: TOKEN_TYPES.ACCESS },
      config.jwt.accessSecret,
      opts,
    );
  },
  signRefresh(payload: { userId: string; jti: string }): string {
    const opts: SignOptions = { expiresIn: config.jwt.refreshExpiresIn as SignOptions["expiresIn"] };
    return jwt.sign(
      { sub: payload.userId, jti: payload.jti, type: TOKEN_TYPES.REFRESH },
      config.jwt.refreshSecret,
      opts,
    );
  },
  verifyAccess(token: string): AccessTokenPayload {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
    if (decoded.type !== TOKEN_TYPES.ACCESS) throw new Error("Invalid token type");
    return decoded;
  },
  verifyRefresh(token: string): RefreshTokenPayload {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload;
    if (decoded.type !== TOKEN_TYPES.REFRESH) throw new Error("Invalid token type");
    return decoded;
  },
  decode<T = JwtPayload>(token: string): T | null {
    return jwt.decode(token) as T | null;
  },
};

export type { TokenType };
