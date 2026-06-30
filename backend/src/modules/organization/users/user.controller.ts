import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { userService } from "./user.service";
import type { CreateUserInput, ListUsersQuery, UpdateSelfProfileInput, UpdateUserInput } from "./user.validator";

export const userController = {
  async create(req: Request, res: Response) {
    const dto = await userService.create(req.body as CreateUserInput, req.user?.id);
    return ApiResponse.created(res, dto, "User created");
  },
  async update(req: Request, res: Response) {
    const dto = await userService.update(req.params.id, req.body as UpdateUserInput, req.user?.id);
    return ApiResponse.ok(res, dto, "User updated");
  },
  async suspend(req: Request, res: Response) {
    const dto = await userService.setStatus(req.params.id, "suspended", req.user?.id);
    return ApiResponse.ok(res, dto, "User suspended");
  },
  async activate(req: Request, res: Response) {
    const dto = await userService.setStatus(req.params.id, "active", req.user?.id);
    return ApiResponse.ok(res, dto, "User activated");
  },
  async getOne(req: Request, res: Response) {
    const dto = await userService.getOne(req.params.id);
    return ApiResponse.ok(res, dto, "OK");
  },
  async me(req: Request, res: Response) {
    const dto = await userService.getOne(req.user!.id);
    return ApiResponse.ok(res, dto, "OK");
  },
  async updateSelf(req: Request, res: Response) {
    const dto = await userService.updateSelf(req.user!.id, req.body as UpdateSelfProfileInput);
    return ApiResponse.ok(res, dto, "Profile updated");
  },
  async list(req: Request, res: Response) {
    const q = req.query as unknown as ListUsersQuery;
    const result = await userService.list(q);
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
