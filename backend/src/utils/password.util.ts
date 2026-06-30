import bcrypt from "bcryptjs";
import { config } from "../config";

export const passwordUtil = {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, config.security.bcryptRounds);
  },
  async compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  },
};
