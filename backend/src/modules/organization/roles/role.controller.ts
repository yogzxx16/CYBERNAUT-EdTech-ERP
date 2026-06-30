import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { roleService } from "./role.service";
import type { UpdateRoleInput } from "./role.validator";

export const roleController = {
  async list(_req: Request, res: Response) {
    const items = await roleService.list();
    return res.status(200).json({
      success: true,
      message: "OK",
      data: items,
      page: 1,
      limit: items.length,
      total: items.length,
      totalPages: 1,
    });
  },
  async update(req: Request, res: Response) {
    const dto = await roleService.update(req.params.id, req.body as UpdateRoleInput);
    return ApiResponse.ok(res, dto, "Role updated");
  },
  async permissions(_req: Request, res: Response) {
    return ApiResponse.ok(res, roleService.permissionCatalog(), "OK");
  },
};
