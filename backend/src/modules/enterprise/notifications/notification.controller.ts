import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { notificationService } from "./notification.service";

export const notificationController = {
  async list(req: Request, res: Response) {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await notificationService.list(req.user!.id, page, limit);
    return ApiResponse.ok(res, result.items, "OK", {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      unread: result.unread,
    });
  },
  async unreadCount(req: Request, res: Response) {
    const unread = await notificationService.unreadCount(req.user!.id);
    return ApiResponse.ok(res, { unread }, "OK");
  },
  async markRead(req: Request, res: Response) {
    const dto = await notificationService.markRead(req.user!.id, req.params.id);
    return ApiResponse.ok(res, dto, "OK");
  },
  async markAllRead(req: Request, res: Response) {
    const result = await notificationService.markAllRead(req.user!.id);
    return ApiResponse.ok(res, result, "OK");
  },
};
