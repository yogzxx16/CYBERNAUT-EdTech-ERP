import crypto from "crypto";

export const tokenGenerator = {
  /** Random URL-safe token for jti / refresh handles. */
  uuid(): string {
    return crypto.randomUUID();
  },
  /** Cryptographically secure opaque token, e.g. for password reset URLs. */
  opaque(bytes = 32): string {
    return crypto.randomBytes(bytes).toString("hex");
  },
  /** SHA-256 hash for storing reset tokens at rest. */
  sha256(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  },
};
