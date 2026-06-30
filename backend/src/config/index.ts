import { env } from "./env";

export const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === "production",
  isDev: env.NODE_ENV === "development",
  port: env.PORT,

  api: {
    prefix: env.API_PREFIX,
    version: env.API_VERSION,
    base: `${env.API_PREFIX}/${env.API_VERSION}`,
  },

  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    passwordResetExpiresIn: env.PASSWORD_RESET_EXPIRES_IN,
  },

  security: {
    bcryptRounds: env.BCRYPT_SALT_ROUNDS,
    cookieSecret: env.COOKIE_SECRET,
    cookieSecure: env.COOKIE_SECURE,
  },

  cors: {
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean),
    credentials: true,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  },
} as const;

export type AppConfig = typeof config;
