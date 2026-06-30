
import { createApp } from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { config } from "./config";
import { logger } from "./utils/logger";
import { runSeed } from "./seed/seed";

async function bootstrap() {
  await connectDB();
  try {
    await runSeed();
  } catch (err) {
    logger.error("Seed failed", err);
  }
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`🚀 API ready on http://localhost:${config.port}${config.api.base}`);
  });

  const shutdown = async (signal: string) => {
    logger.warn(`${signal} received, shutting down…`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.error("Fatal bootstrap error", err);
  process.exit(1);
});
