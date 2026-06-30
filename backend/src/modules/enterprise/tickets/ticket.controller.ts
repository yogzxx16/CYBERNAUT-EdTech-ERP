import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { ticketService } from "./ticket.service";
import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketQuery,
  ReplyTicketInput,
} from "./ticket.validator";
import type { Role } from "../../../config/constants";

function actor(req: Request) {
  return { id: req.user!.id, role: req.user!.role as Role };
}

export const ticketController = {
  async list(req: Request, res: Response) {
    const r = await ticketService.list(req.query as unknown as ListTicketQuery, actor(req));
    return ApiResponse.ok(res, r.items, "OK", {
      page: r.page,
      limit: r.limit,
      total: r.total,
      totalPages: r.totalPages,
    });
  },
  async getOne(req: Request, res: Response) {
    return ApiResponse.ok(res, await ticketService.getOne(req.params.id, actor(req)));
  },
  async create(req: Request, res: Response) {
    return ApiResponse.created(
      res,
      await ticketService.create(req.body as CreateTicketInput, actor(req)),
      "Ticket created",
    );
  },
  async reply(req: Request, res: Response) {
    return ApiResponse.ok(
      res,
      await ticketService.reply(req.params.id, req.body as ReplyTicketInput, actor(req)),
      "Reply added",
    );
  },
  async assign(req: Request, res: Response) {
    return ApiResponse.ok(
      res,
      await ticketService.assign(req.params.id, req.body as AssignTicketInput, actor(req)),
      "Ticket assigned",
    );
  },
  async close(req: Request, res: Response) {
    return ApiResponse.ok(res, await ticketService.close(req.params.id, actor(req)), "Ticket closed");
  },
  async reopen(req: Request, res: Response) {
    return ApiResponse.ok(res, await ticketService.reopen(req.params.id, actor(req)), "Ticket reopened");
  },
};
