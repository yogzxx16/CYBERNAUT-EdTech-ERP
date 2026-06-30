import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { leaveService } from "./leave.service";
import type {
  CreateLeaveInput,
  DecideLeaveInput,
  ListLeavesQuery,
  UpdateLeaveInput,
} from "./leave.validator";
import type { Role } from "../../../config/constants";

function actor(req: Request) {
  return { id: req.user!.id, role: req.user!.role as Role };
}

export const leaveController = {
  async create(req: Request, res: Response) {
    const dto = await leaveService.create(req.body as CreateLeaveInput, actor(req));
    return ApiResponse.created(res, dto, "Leave request submitted");
  },
  async update(req: Request, res: Response) {
    const dto = await leaveService.update(req.params.id, req.body as UpdateLeaveInput, actor(req));
    return ApiResponse.ok(res, dto, "Leave updated");
  },
  async cancel(req: Request, res: Response) {
    const dto = await leaveService.cancel(req.params.id, actor(req));
    return ApiResponse.ok(res, dto, "Leave cancelled");
  },
  async decide(req: Request, res: Response) {
    const dto = await leaveService.decide(req.params.id, req.body as DecideLeaveInput, actor(req));
    return ApiResponse.ok(res, dto, "Decision recorded");
  },
  async getOne(req: Request, res: Response) {
    const dto = await leaveService.getOne(req.params.id, actor(req));
    return ApiResponse.ok(res, dto, "OK");
  },
  async list(req: Request, res: Response) {
    const q = req.query as unknown as ListLeavesQuery;
    const result = await leaveService.list(q, actor(req));
    return res.status(200).json({
      success: true,
      message: "OK",
      data: result.items,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  },
};
