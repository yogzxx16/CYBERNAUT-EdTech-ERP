import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { departmentService } from "./department.service";
import type {
  CreateDepartmentInput,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
} from "./department.validator";

export const departmentController = {
  async create(req: Request, res: Response) {
    const dto = await departmentService.create(req.body as CreateDepartmentInput, req.user?.id);
    return ApiResponse.created(res, dto, "Department created");
  },
  async update(req: Request, res: Response) {
    const dto = await departmentService.update(
      req.params.id,
      req.body as UpdateDepartmentInput,
      req.user?.id,
    );
    return ApiResponse.ok(res, dto, "Department updated");
  },
  async archive(req: Request, res: Response) {
    const dto = await departmentService.archive(req.params.id, req.user?.id);
    return ApiResponse.ok(res, dto, "Department archived");
  },
  async restore(req: Request, res: Response) {
    const dto = await departmentService.restore(req.params.id, req.user?.id);
    return ApiResponse.ok(res, dto, "Department restored");
  },
  async getOne(req: Request, res: Response) {
    const dto = await departmentService.getOne(req.params.id);
    return ApiResponse.ok(res, dto, "OK");
  },
  async list(req: Request, res: Response) {
    const q = req.query as unknown as ListDepartmentsQuery;
    const result = await departmentService.list(q);
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
