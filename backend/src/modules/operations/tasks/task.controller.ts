import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { taskService } from "./task.service";
import type {
  AddAttachmentInput,
  AddCommentInput,
  CreateTaskInput,
  ListTasksQuery,
  ReviewTaskInput,
  SubmitTaskInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "./task.validator";
import type { Role } from "../../../config/constants";

function actor(req: Request) {
  return { id: req.user!.id, role: req.user!.role as Role };
}

export const taskController = {
  async create(req: Request, res: Response) {
    const dto = await taskService.create(req.body as CreateTaskInput, actor(req));
    return ApiResponse.created(res, dto, "Task created");
  },
  async update(req: Request, res: Response) {
    const dto = await taskService.update(req.params.id, req.body as UpdateTaskInput, actor(req));
    return ApiResponse.ok(res, dto, "Task updated");
  },
  async updateStatus(req: Request, res: Response) {
    const dto = await taskService.updateStatus(
      req.params.id,
      req.body as UpdateTaskStatusInput,
      actor(req),
    );
    return ApiResponse.ok(res, dto, "Status updated");
  },
  async addComment(req: Request, res: Response) {
    const dto = await taskService.addComment(req.params.id, req.body as AddCommentInput, actor(req));
    return ApiResponse.ok(res, dto, "Comment added");
  },
  async addAttachment(req: Request, res: Response) {
    const dto = await taskService.addAttachment(
      req.params.id,
      req.body as AddAttachmentInput,
      actor(req),
    );
    return ApiResponse.ok(res, dto, "Attachment added");
  },
  async removeAttachment(req: Request, res: Response) {
    const dto = await taskService.removeAttachment(
      req.params.id,
      req.params.attachmentId,
      actor(req),
    );
    return ApiResponse.ok(res, dto, "Attachment removed");
  },
  async submit(req: Request, res: Response) {
    const dto = await taskService.submit(req.params.id, req.body as SubmitTaskInput, actor(req));
    return ApiResponse.ok(res, dto, "Task submitted");
  },
  async review(req: Request, res: Response) {
    const dto = await taskService.review(req.params.id, req.body as ReviewTaskInput, actor(req));
    return ApiResponse.ok(res, dto, "Review recorded");
  },
  async getOne(req: Request, res: Response) {
    const dto = await taskService.getOne(req.params.id, actor(req));
    return ApiResponse.ok(res, dto, "OK");
  },
  async list(req: Request, res: Response) {
    const q = req.query as unknown as ListTasksQuery;
    const result = await taskService.list(q, actor(req));
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
