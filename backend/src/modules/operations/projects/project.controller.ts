import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { projectService } from "./project.service";
import type {
  AssignMembersInput,
  CreateProjectInput,
  ListProjectsQuery,
  RemoveMemberInput,
  ReviewProjectInput,
  SubmitProjectInput,
  UpdateProgressInput,
  UpdateProjectInput,
  UpdateStatusInput,
} from "./project.validator";
import type { Role } from "../../../config/constants";

function actor(req: Request) {
  return { id: req.user!.id, role: req.user!.role as Role };
}

export const projectController = {
  async create(req: Request, res: Response) {
    const dto = await projectService.create(req.body as CreateProjectInput, actor(req));
    return ApiResponse.created(res, dto, "Project created");
  },
  async update(req: Request, res: Response) {
    const dto = await projectService.update(
      req.params.id,
      req.body as UpdateProjectInput,
      actor(req),
    );
    return ApiResponse.ok(res, dto, "Project updated");
  },
  async archive(req: Request, res: Response) {
    const dto = await projectService.archive(req.params.id, actor(req));
    return ApiResponse.ok(res, dto, "Project archived");
  },
  async assign(req: Request, res: Response) {
    const dto = await projectService.assign(
      req.params.id,
      req.body as AssignMembersInput,
      actor(req),
    );
    return ApiResponse.ok(res, dto, "Members assigned");
  },
  async removeMember(req: Request, res: Response) {
    const dto = await projectService.removeMember(
      req.params.id,
      (req.body as RemoveMemberInput).userId,
      actor(req),
    );
    return ApiResponse.ok(res, dto, "Member removed");
  },
  async updateProgress(req: Request, res: Response) {
    const dto = await projectService.updateProgress(
      req.params.id,
      req.body as UpdateProgressInput,
      actor(req),
    );
    return ApiResponse.ok(res, dto, "Progress updated");
  },
  async updateStatus(req: Request, res: Response) {
    const dto = await projectService.updateStatus(
      req.params.id,
      req.body as UpdateStatusInput,
      actor(req),
    );
    return ApiResponse.ok(res, dto, "Status updated");
  },
  async submit(req: Request, res: Response) {
    const dto = await projectService.submit(
      req.params.id,
      req.body as SubmitProjectInput,
      actor(req),
    );
    return ApiResponse.ok(res, dto, "Project submitted");
  },
  async review(req: Request, res: Response) {
    const dto = await projectService.review(
      req.params.id,
      req.body as ReviewProjectInput,
      actor(req),
    );
    return ApiResponse.ok(res, dto, "Review recorded");
  },
  async getOne(req: Request, res: Response) {
    const dto = await projectService.getOne(req.params.id, actor(req));
    return ApiResponse.ok(res, dto, "OK");
  },
  async list(req: Request, res: Response) {
    const q = req.query as unknown as ListProjectsQuery;
    const result = await projectService.list(q, actor(req));
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
