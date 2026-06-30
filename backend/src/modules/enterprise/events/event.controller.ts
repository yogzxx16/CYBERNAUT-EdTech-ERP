import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { eventService } from "./event.service";
import type {
  CreateEventInput,
  ListEventQuery,
  RSVPInput,
  UpdateEventInput,
} from "./event.validator";
import type { Role } from "../../../config/constants";

function actor(req: Request) {
  return { id: req.user!.id, role: req.user!.role as Role };
}

export const eventController = {
  async list(req: Request, res: Response) {
    const r = await eventService.list(req.query as unknown as ListEventQuery);
    return ApiResponse.ok(res, r.items, "OK", {
      page: r.page,
      limit: r.limit,
      total: r.total,
      totalPages: r.totalPages,
    });
  },
  async getOne(req: Request, res: Response) {
    return ApiResponse.ok(res, await eventService.getOne(req.params.id));
  },
  async create(req: Request, res: Response) {
    return ApiResponse.created(
      res,
      await eventService.create(req.body as CreateEventInput, actor(req)),
      "Event created",
    );
  },
  async update(req: Request, res: Response) {
    return ApiResponse.ok(
      res,
      await eventService.update(req.params.id, req.body as UpdateEventInput, actor(req)),
      "Event updated",
    );
  },
  async remove(req: Request, res: Response) {
    return ApiResponse.ok(res, await eventService.remove(req.params.id, actor(req)), "Event deleted");
  },
  async rsvp(req: Request, res: Response) {
    return ApiResponse.ok(
      res,
      await eventService.rsvp(req.params.id, req.body as RSVPInput, actor(req)),
      "RSVP recorded",
    );
  },
};
