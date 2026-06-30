import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { departmentController } from "./department.controller";
import {
  createDepartmentSchema,
  listDepartmentsSchema,
  updateDepartmentSchema,
} from "./department.validator";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission(PERMISSIONS.DEPARTMENT_VIEW),
  validate(listDepartmentsSchema, "query"),
  asyncHandler(departmentController.list),
);
router.get(
  "/:id",
  requirePermission(PERMISSIONS.DEPARTMENT_VIEW),
  asyncHandler(departmentController.getOne),
);
router.post(
  "/",
  requirePermission(PERMISSIONS.DEPARTMENT_CREATE),
  validate(createDepartmentSchema),
  asyncHandler(departmentController.create),
);
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.DEPARTMENT_UPDATE),
  validate(updateDepartmentSchema),
  asyncHandler(departmentController.update),
);
router.post(
  "/:id/archive",
  requirePermission(PERMISSIONS.DEPARTMENT_ARCHIVE),
  asyncHandler(departmentController.archive),
);
router.post(
  "/:id/restore",
  requirePermission(PERMISSIONS.DEPARTMENT_ARCHIVE),
  asyncHandler(departmentController.restore),
);

export const departmentRouter = router;
