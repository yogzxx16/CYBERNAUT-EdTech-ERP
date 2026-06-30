import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { announcementController } from "./announcement.controller";
import {
  createAnnouncementSchema,
  listAnnouncementSchema,
  updateAnnouncementSchema,
} from "./announcement.validator";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission(PERMISSIONS.ANNOUNCEMENT_VIEW),
  validate(listAnnouncementSchema, "query"),
  asyncHandler(announcementController.list),
);
router.get(
  "/:id",
  requirePermission(PERMISSIONS.ANNOUNCEMENT_VIEW),
  asyncHandler(announcementController.getOne),
);
router.post(
  "/",
  requirePermission(PERMISSIONS.ANNOUNCEMENT_MANAGE),
  validate(createAnnouncementSchema),
  asyncHandler(announcementController.create),
);
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.ANNOUNCEMENT_MANAGE),
  validate(updateAnnouncementSchema),
  asyncHandler(announcementController.update),
);
router.post(
  "/:id/publish",
  requirePermission(PERMISSIONS.ANNOUNCEMENT_MANAGE),
  asyncHandler(announcementController.publish),
);
router.post(
  "/:id/archive",
  requirePermission(PERMISSIONS.ANNOUNCEMENT_MANAGE),
  asyncHandler(announcementController.archive),
);

export const announcementRouter = router;
