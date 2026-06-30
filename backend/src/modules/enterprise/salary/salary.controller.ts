import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { salaryService } from "./salary.service";
import type { GenerateSalaryInput, ListSalaryQuery } from "./salary.validator";
import type { Role } from "../../../config/constants";

function actor(req: Request) {
  return { id: req.user!.id, role: req.user!.role as Role };
}

export const salaryController = {
  async list(req: Request, res: Response) {
    const r = await salaryService.list(req.query as unknown as ListSalaryQuery, actor(req));
    return ApiResponse.ok(res, r.items, "OK", {
      page: r.page,
      limit: r.limit,
      total: r.total,
      totalPages: r.totalPages,
    });
  },
  async getOne(req: Request, res: Response) {
    return ApiResponse.ok(res, await salaryService.getOne(req.params.id, actor(req)));
  },
  async generate(req: Request, res: Response) {
    const body = req.body as GenerateSalaryInput;
    const employeeId = body.employeeId ?? body.employee;
    return ApiResponse.created(
      res,
      await salaryService.generate({ ...body, employee: employeeId, employeeId }, actor(req)),
      "Salary slip generated",
    );
  },
};
