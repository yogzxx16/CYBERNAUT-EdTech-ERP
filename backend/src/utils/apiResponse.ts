import type { Response } from "express";
import { HTTP_STATUS } from "../config/constants";

export interface ApiSuccessShape<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export class ApiResponse {
  static ok<T>(res: Response, data: T, message = "OK", meta?: Record<string, unknown>) {
    return ApiResponse.send(res, HTTP_STATUS.OK, data, message, meta);
  }
  static created<T>(res: Response, data: T, message = "Created") {
    return ApiResponse.send(res, HTTP_STATUS.CREATED, data, message);
  }
  static noContent(res: Response) {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }
  static send<T>(
    res: Response,
    status: number,
    data: T,
    message: string,
    meta?: Record<string, unknown>,
  ) {
    const payload: ApiSuccessShape<T> = { success: true, message, data };
    if (meta) payload.meta = meta;
    return res.status(status).json(payload);
  }
}
