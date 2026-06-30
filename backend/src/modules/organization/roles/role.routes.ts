import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { roleController } from "./role.controller";
import { updateRoleSchema } from "./role.validator";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission(PERMISSIONS.ROLE_VIEW), asyncHandler(roleController.list));
router.get(
  "/permissions",
  requirePermission(PERMISSIONS.ROLE_VIEW),
  asyncHandler(roleController.permissions),
);
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.ROLE_UPDATE),
  validate(updateRoleSchema),
  asyncHandler(roleController.update),
);

export const roleRouter = router;
