import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { announcementService } from "./announcement.service";
import type {
  CreateAnnouncementInput,
  ListAnnouncementQuery,
  UpdateAnnouncementInput,
} from "./announcement.validator";
import type { Role } from "../../../config/constants";

function actor(req: Request) {
  return { id: req.user!.id, role: req.user!.role as Role };
}

export const announcementController = {
  async list(req: Request, res: Response) {
    const q = req.query as unknown as ListAnnouncementQuery;
    const result = await announcementService.list(q, actor(req));
    return ApiResponse.ok(res, result.items, "OK", {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  },
  async getOne(req: Request, res: Response) {
    const dto = await announcementService.getOne(req.params.id);
    return ApiResponse.ok(res, dto);
  },
  async create(req: Request, res: Response) {
    const dto = await announcementService.create(
      req.body as CreateAnnouncementInput,
      actor(req),
    );
    return ApiResponse.created(res, dto, "Announcement created");
  },
  async update(req: Request, res: Response) {
    const dto = await announcementService.update(
      req.params.id,
      req.body as UpdateAnnouncementInput,
    );
    return ApiResponse.ok(res, dto, "Announcement updated");
  },
  async publish(req: Request, res: Response) {
    const dto = await announcementService.publish(req.params.id, actor(req));
    return ApiResponse.ok(res, dto, "Announcement published");
  },
  async archive(req: Request, res: Response) {
    const dto = await announcementService.archive(req.params.id);
    return ApiResponse.ok(res, dto, "Announcement archived");
  },
};
