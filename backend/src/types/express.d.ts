import type { Role } from "../config/constants";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface UserClaims {
      id: string;
      role: Role;
    }
    interface Request {
      user?: UserClaims;
      requestId?: string;
    }
  }
}

export {};
