import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { discussionService } from "./discussion.service";
import type {
  CreateDiscussionInput,
  EditMessageInput,
  ListDiscussionQuery,
  ParticipantsInput,
  PostMessageInput,
  UpdateDiscussionInput,
} from "./discussion.validator";
import type { Role } from "../../../config/constants";

function actor(req: Request) {
  return { id: req.user!.id, role: req.user!.role as Role };
}

export const discussionController = {
  async list(req: Request, res: Response) {
    const q = req.query as unknown as ListDiscussionQuery;
    const r = await discussionService.list(q, actor(req));
    return ApiResponse.ok(res, r.items, "OK", {
      page: r.page,
      limit: r.limit,
      total: r.total,
      totalPages: r.totalPages,
    });
  },
  async getOne(req: Request, res: Response) {
    return ApiResponse.ok(res, await discussionService.getOne(req.params.id, actor(req)));
  },
  async create(req: Request, res: Response) {
    return ApiResponse.created(
      res,
      await discussionService.create(req.body as CreateDiscussionInput, actor(req)),
      "Discussion created",
    );
  },
  async update(req: Request, res: Response) {
    return ApiResponse.ok(
      res,
      await discussionService.update(req.params.id, req.body as UpdateDiscussionInput, actor(req)),
      "Discussion updated",
    );
  },
  async setParticipants(req: Request, res: Response) {
    return ApiResponse.ok(
      res,
      await discussionService.setParticipants(
        req.params.id,
        req.body as ParticipantsInput,
        actor(req),
      ),
      "Participants updated",
    );
  },
  async postMessage(req: Request, res: Response) {
    return ApiResponse.created(
      res,
      await discussionService.postMessage(
        req.params.id,
        req.body as PostMessageInput,
        actor(req),
      ),
      "Message posted",
    );
  },
  async editMessage(req: Request, res: Response) {
    return ApiResponse.ok(
      res,
      await discussionService.editMessage(
        req.params.id,
        req.params.messageId,
        req.body as EditMessageInput,
        actor(req),
      ),
      "Message updated",
    );
  },
};
