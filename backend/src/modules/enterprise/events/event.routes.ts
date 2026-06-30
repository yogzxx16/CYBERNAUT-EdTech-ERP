import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { eventController } from "./event.controller";
import {
  createEventSchema,
  listEventSchema,
  rsvpSchema,
  updateEventSchema,
} from "./event.validator";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission(PERMISSIONS.EVENT_VIEW),
  validate(listEventSchema, "query"),
  asyncHandler(eventController.list),
);
router.get(
  "/:id",
  requirePermission(PERMISSIONS.EVENT_VIEW),
  asyncHandler(eventController.getOne),
);
router.post(
  "/",
  requirePermission(PERMISSIONS.EVENT_MANAGE),
  validate(createEventSchema),
  asyncHandler(eventController.create),
);
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.EVENT_MANAGE),
  validate(updateEventSchema),
  asyncHandler(eventController.update),
);
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.EVENT_MANAGE),
  asyncHandler(eventController.remove),
);
router.post(
  "/:id/rsvp",
  requirePermission(PERMISSIONS.EVENT_VIEW),
  validate(rsvpSchema),
  asyncHandler(eventController.rsvp),
);

export const eventRouter = router;
