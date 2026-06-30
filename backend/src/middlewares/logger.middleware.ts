import morgan from "morgan";
import type { RequestHandler } from "express";
import { config } from "../config";

export const requestLogger: RequestHandler = morgan(config.isProd ? "combined" : "dev");
