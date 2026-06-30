import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { projectController } from "./project.controller";
import {
  assignMembersSchema,
  createProjectSchema,
  listProjectsSchema,
  removeMemberSchema,
  reviewProjectSchema,
  submitProjectSchema,
  updateProgressSchema,
  updateProjectSchema,
  updateStatusSchema,
} from "./project.validator";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission(PERMISSIONS.PROJECT_VIEW),
  validate(listProjectsSchema, "query"),
  asyncHandler(projectController.list),
);
router.get(
  "/:id",
  requirePermission(PERMISSIONS.PROJECT_VIEW),
  asyncHandler(projectController.getOne),
);
router.post(
  "/",
  requirePermission(PERMISSIONS.PROJECT_CREATE),
  validate(createProjectSchema),
  asyncHandler(projectController.create),
);
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.PROJECT_UPDATE),
  validate(updateProjectSchema),
  asyncHandler(projectController.update),
);
router.post(
  "/:id/archive",
  requirePermission(PERMISSIONS.PROJECT_ARCHIVE),
  asyncHandler(projectController.archive),
);
router.post(
  "/:id/members",
  requirePermission(PERMISSIONS.PROJECT_VIEW),
  validate(assignMembersSchema),
  asyncHandler(projectController.assign),
);
router.delete(
  "/:id/members",
  requirePermission(PERMISSIONS.PROJECT_VIEW),
  validate(removeMemberSchema),
  asyncHandler(projectController.removeMember),
);
router.patch(
  "/:id/progress",
  requirePermission(PERMISSIONS.PROJECT_VIEW),
  validate(updateProgressSchema),
  asyncHandler(projectController.updateProgress),
);
router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.PROJECT_UPDATE),
  validate(updateStatusSchema),
  asyncHandler(projectController.updateStatus),
);
router.post(
  "/:id/submit",
  requirePermission(PERMISSIONS.PROJECT_UPDATE),
  validate(submitProjectSchema),
  asyncHandler(projectController.submit),
);
router.post(
  "/:id/review",
  requirePermission(PERMISSIONS.PROJECT_UPDATE),
  validate(reviewProjectSchema),
  asyncHandler(projectController.review),
);

export const projectRouter = router;
