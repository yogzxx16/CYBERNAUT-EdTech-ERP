import express, { type Express } from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { config } from "./config";
import { requestLogger } from "./middlewares/logger.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { buildV1Router } from "./routes";
import { UPLOAD_ROOT } from "./modules/shared/uploads/upload.service";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  // Security
  app.use(
    helmet({
      // Allow cross-origin <img>/<a download> from /uploads (served below) so
      // the SPA on a different port can fetch user-uploaded files.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const list = config.cors.origin;
        if (list.includes("*") || list.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: config.cors.credentials,
    }),
  );

  // Parsers
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(config.security.cookieSecret));

  // Logging
  app.use(requestLogger);

  // Global rate limiter — exclude /uploads static reads to avoid throttling browser asset fetches.
  app.use((req, res, next) => {
    if (req.path.startsWith("/uploads/")) return next();
    return rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    })(req, res, next);
  });

  // Static — uploaded files. Served from /uploads/<kind>/<filename>.
  app.use(
    "/uploads",
    express.static(UPLOAD_ROOT, {
      fallthrough: false,
      maxAge: "7d",
      index: false,
      dotfiles: "deny",
    }),
  );

  // Routes
  app.use(`${config.api.prefix}/${config.api.version}`, buildV1Router());

  // 404 + error
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
// Touch — keep path import resolvable in test bundlers.
void path;
