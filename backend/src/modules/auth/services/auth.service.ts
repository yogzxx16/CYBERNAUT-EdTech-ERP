
import { ApiError } from "../../../utils/apiError";
import { jwtUtil } from "../../../utils/jwt.util";
import { passwordUtil } from "../../../utils/password.util";
import { tokenGenerator } from "../../../utils/token.util";
import { config } from "../../../config";
import { TOKEN_TYPES } from "../../../config/constants";
import { userRepository, type UserDoc } from "../repositories/user.repository";
import { tokenRepository } from "../repositories/token.repository";
import type {
  AuthSessionDTO,
  AuthTokensDTO,
  AuthUserDTO,
} from "../dto/auth.dto";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "../validators/auth.validator";
import { logger } from "../../../utils/logger";

function toUserDTO(u: UserDoc): AuthUserDTO {
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    forcePasswordChange: u.forcePasswordChange,
    profileImage: u.profileImage,
    createdAt: u.createdAt.toISOString(),
  };
}

/** Parse "15m" / "7d" / "30s" / "2h" → milliseconds. Falls back to 15m. */
function parseDuration(input: string): number {
  const m = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(input.trim());
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  switch (m[2].toLowerCase()) {
    case "ms": return n;
    case "s": return n * 1000;
    case "m": return n * 60 * 1000;
    case "h": return n * 60 * 60 * 1000;
    case "d": return n * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

async function issueTokens(user: UserDoc): Promise<AuthTokensDTO> {
  const jti = tokenGenerator.uuid();
  const accessToken = jwtUtil.signAccess({ userId: user._id.toString(), role: user.role });
  const refreshToken = jwtUtil.signRefresh({ userId: user._id.toString(), jti });

  await tokenRepository.create({
    userId: user._id.toString(),
    tokenHash: tokenGenerator.sha256(refreshToken),
    type: TOKEN_TYPES.REFRESH,
    expiresAt: new Date(Date.now() + parseDuration(config.jwt.refreshExpiresIn)),
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: config.jwt.accessExpiresIn,
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthSessionDTO> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw ApiError.conflict("Email already registered");

    const hashed = await passwordUtil.hash(input.password);
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password: hashed,
      role: input.role as UserDoc["role"] | undefined,
    });

    const tokens = await issueTokens(user);
    return { user: toUserDTO(user), tokens };
  },

  async login(input: LoginInput): Promise<AuthSessionDTO> {
    const user = await userRepository.findByEmail(input.email, true);
    if (!user || !user.isActive) throw ApiError.unauthorized("Invalid credentials");

    const ok = await passwordUtil.compare(input.password, user.password);
    if (!ok) throw ApiError.unauthorized("Invalid credentials");

    const tokens = await issueTokens(user);
    return { user: toUserDTO(user), tokens };
  },

  async refresh(refreshToken: string): Promise<AuthTokensDTO> {
    if (!refreshToken) throw ApiError.unauthorized("Missing refresh token");

    let payload;
    try {
      payload = jwtUtil.verifyRefresh(refreshToken);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const hash = tokenGenerator.sha256(refreshToken);
    const stored = await tokenRepository.findActive(hash, TOKEN_TYPES.REFRESH);
    if (!stored) throw ApiError.unauthorized("Refresh token revoked or unknown");

    const user = await userRepository.findById(payload.sub);
    if (!user || !user.isActive) throw ApiError.unauthorized("User no longer active");

    // Rotate: revoke current, issue new
    await tokenRepository.revokeById(stored._id.toString());
    return issueTokens(user);
  },

  async logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) return;
    const hash = tokenGenerator.sha256(refreshToken);
    const stored = await tokenRepository.findActive(hash, TOKEN_TYPES.REFRESH);
    if (stored) await tokenRepository.revokeById(stored._id.toString());
  },

  async forgotPassword(input: ForgotPasswordInput): Promise<{ resetToken?: string }> {
    const user = await userRepository.findByEmail(input.email);
    // Always succeed — do not leak account existence.
    if (!user) return {};

    const rawToken = tokenGenerator.opaque(32);
    const hash = tokenGenerator.sha256(rawToken);
    const expiresAt = new Date(Date.now() + parseDuration(config.jwt.passwordResetExpiresIn));

    await tokenRepository.revokeAllForUser(user._id.toString(), TOKEN_TYPES.RESET_PASSWORD);
    await tokenRepository.create({
      userId: user._id.toString(),
      tokenHash: hash,
      type: TOKEN_TYPES.RESET_PASSWORD,
      expiresAt,
    });

    // TODO: dispatch email with a link containing rawToken.
    if (config.isDev) logger.info(`🔑 Password reset token for ${user.email}: ${rawToken}`);

    // In dev we return the token so it can be tested without an email service.
    return config.isDev ? { resetToken: rawToken } : {};
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const hash = tokenGenerator.sha256(input.token);
    const record = await tokenRepository.findActive(hash, TOKEN_TYPES.RESET_PASSWORD);
    if (!record) throw ApiError.badRequest("Invalid or expired reset token");

    const hashedPassword = await passwordUtil.hash(input.password);
    await userRepository.updatePassword(record.user.toString(), hashedPassword);
    await tokenRepository.revokeById(record._id.toString());
    await tokenRepository.revokeAllForUser(record.user.toString(), TOKEN_TYPES.REFRESH);
  },

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await userRepository.findById(userId, true);
    if (!user) throw ApiError.unauthorized();

    const ok = await passwordUtil.compare(input.currentPassword, user.password);
    if (!ok) throw ApiError.badRequest("Current password is incorrect");

    const hashed = await passwordUtil.hash(input.newPassword);
    await userRepository.updatePassword(user._id.toString(), hashed);
    await tokenRepository.revokeAllForUser(user._id.toString(), TOKEN_TYPES.REFRESH);
    try {
      const { notificationService } = await import("../../enterprise/notifications/notification.service");
      await notificationService.notify({
        recipients: [user._id.toString()],
        type: "password.changed",
        title: "Password changed",
        body: "Your account password was changed successfully.",
        link: "/profile",
      });
    } catch {
      /* never fail the password change */
    }
  },

  async me(userId: string): Promise<AuthUserDTO> {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound("User not found");
    return toUserDTO(user);
  },
};
