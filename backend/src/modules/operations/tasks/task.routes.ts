import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { taskController } from "./task.controller";
import {
  addAttachmentSchema,
  addCommentSchema,
  createTaskSchema,
  listTasksSchema,
  reviewTaskSchema,
  submitTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "./task.validator";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission(PERMISSIONS.TASK_VIEW),
  validate(listTasksSchema, "query"),
  asyncHandler(taskController.list),
);
router.get("/:id", requirePermission(PERMISSIONS.TASK_VIEW), asyncHandler(taskController.getOne));
router.post(
  "/",
  requirePermission(PERMISSIONS.TASK_CREATE),
  validate(createTaskSchema),
  asyncHandler(taskController.create),
);
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.TASK_UPDATE),
  validate(updateTaskSchema),
  asyncHandler(taskController.update),
);
router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.TASK_UPDATE),
  validate(updateTaskStatusSchema),
  asyncHandler(taskController.updateStatus),
);
router.post(
  "/:id/comments",
  requirePermission(PERMISSIONS.TASK_VIEW),
  validate(addCommentSchema),
  asyncHandler(taskController.addComment),
);
router.post(
  "/:id/attachments",
  requirePermission(PERMISSIONS.TASK_VIEW),
  validate(addAttachmentSchema),
  asyncHandler(taskController.addAttachment),
);
router.delete(
  "/:id/attachments/:attachmentId",
  requirePermission(PERMISSIONS.TASK_UPDATE),
  asyncHandler(taskController.removeAttachment),
);
router.post(
  "/:id/submit",
  requirePermission(PERMISSIONS.TASK_UPDATE),
  validate(submitTaskSchema),
  asyncHandler(taskController.submit),
);
router.post(
  "/:id/review",
  requirePermission(PERMISSIONS.TASK_UPDATE),
  validate(reviewTaskSchema),
  asyncHandler(taskController.review),
);

export const taskRouter = router;
