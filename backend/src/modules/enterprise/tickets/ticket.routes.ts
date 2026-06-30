import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { ticketController } from "./ticket.controller";
import {
  assignTicketSchema,
  createTicketSchema,
  listTicketSchema,
  replyTicketSchema,
} from "./ticket.validator";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission(PERMISSIONS.TICKET_VIEW),
  validate(listTicketSchema, "query"),
  asyncHandler(ticketController.list),
);
router.get(
  "/:id",
  requirePermission(PERMISSIONS.TICKET_VIEW),
  asyncHandler(ticketController.getOne),
);
router.post(
  "/",
  requirePermission(PERMISSIONS.TICKET_CREATE),
  validate(createTicketSchema),
  asyncHandler(ticketController.create),
);
router.post(
  "/:id/reply",
  requirePermission(PERMISSIONS.TICKET_VIEW),
  validate(replyTicketSchema),
  asyncHandler(ticketController.reply),
);
router.post(
  "/:id/assign",
  requirePermission(PERMISSIONS.TICKET_MANAGE),
  validate(assignTicketSchema),
  asyncHandler(ticketController.assign),
);
router.post(
  "/:id/close",
  requirePermission(PERMISSIONS.TICKET_VIEW),
  asyncHandler(ticketController.close),
);
router.post(
  "/:id/reopen",
  requirePermission(PERMISSIONS.TICKET_VIEW),
  asyncHandler(ticketController.reopen),
);

export const ticketRouter = router;
