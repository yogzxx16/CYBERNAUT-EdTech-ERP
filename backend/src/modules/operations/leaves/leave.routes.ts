import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { leaveController } from "./leave.controller";
import {
  createLeaveSchema,
  decideLeaveSchema,
  listLeavesSchema,
  updateLeaveSchema,
} from "./leave.validator";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission(PERMISSIONS.LEAVE_VIEW),
  validate(listLeavesSchema, "query"),
  asyncHandler(leaveController.list),
);
router.get(
  "/:id",
  requirePermission(PERMISSIONS.LEAVE_VIEW),
  asyncHandler(leaveController.getOne),
);
router.post(
  "/",
  requirePermission(PERMISSIONS.LEAVE_CREATE),
  validate(createLeaveSchema),
  asyncHandler(leaveController.create),
);
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.LEAVE_CREATE),
  validate(updateLeaveSchema),
  asyncHandler(leaveController.update),
);
router.post(
  "/:id/cancel",
  requirePermission(PERMISSIONS.LEAVE_CREATE),
  asyncHandler(leaveController.cancel),
);
router.post(
  "/:id/decision",
  requirePermission(PERMISSIONS.LEAVE_APPROVE),
  validate(decideLeaveSchema),
  asyncHandler(leaveController.decide),
);

export const leaveRouter = router;
