import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { activityService } from "./activity.service";
import type { ListActivitiesQuery } from "./activity.validator";
import type { ActivityEntity, ActivityListQuery } from "./activity.repository";

export const activityController = {
  async list(req: Request, res: Response) {
    const q = req.query as unknown as ListActivitiesQuery;
    const result = await activityService.list(q as unknown as ActivityListQuery);
    return ApiResponse.ok(res, result.items, "OK", {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  },
  async forEntity(req: Request, res: Response) {
    const entity = req.params.entity as ActivityEntity;
    const entityId = req.params.entityId;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await activityService.list({ page, limit, entity, entityId });
    return ApiResponse.ok(res, result.items, "OK", {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  },
};
