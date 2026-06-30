import { HTTP_STATUS } from "../config/constants";

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, details);
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message);
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message);
  }
  static notFound(message = "Not found") {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message);
  }
  static conflict(message = "Conflict") {
    return new ApiError(HTTP_STATUS.CONFLICT, message);
  }
  static internal(message = "Internal server error") {
    return new ApiError(HTTP_STATUS.INTERNAL, message);
  }
}
