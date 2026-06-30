import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { auditService } from "./audit.service";
import type { ListAuditQuery } from "./audit.validator";

export const auditController = {
  async list(req: Request, res: Response) {
    const q = req.query as unknown as ListAuditQuery;
    const result = await auditService.list(q);
    return ApiResponse.ok(res, result.items, "OK", {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  },
};
