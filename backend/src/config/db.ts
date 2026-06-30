import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

mongoose.set("strictQuery", true);

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info(`🟢 MongoDB connected (${mongoose.connection.name})`);
  } catch (err) {
    logger.error("❌ MongoDB connection failed", err);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("error", (e) => logger.error("MongoDB error", e));
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
