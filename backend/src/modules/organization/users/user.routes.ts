import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { userController } from "./user.controller";
import {
  createUserSchema,
  listUsersSchema,
  updateSelfProfileSchema,
  updateUserSchema,
} from "./user.validator";

const router = Router();
router.use(authenticate);

// Self-service — must be defined BEFORE /:id
router.get("/me", asyncHandler(userController.me));
router.patch("/me", validate(updateSelfProfileSchema), asyncHandler(userController.updateSelf));

router.get(
  "/",
  requirePermission(PERMISSIONS.USER_VIEW),
  validate(listUsersSchema, "query"),
  asyncHandler(userController.list),
);
router.get("/:id", requirePermission(PERMISSIONS.USER_VIEW), asyncHandler(userController.getOne));
router.post(
  "/",
  requirePermission(PERMISSIONS.USER_CREATE),
  validate(createUserSchema),
  asyncHandler(userController.create),
);
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.USER_UPDATE),
  validate(updateUserSchema),
  asyncHandler(userController.update),
);
router.post(
  "/:id/suspend",
  requirePermission(PERMISSIONS.USER_SUSPEND),
  asyncHandler(userController.suspend),
);
router.post(
  "/:id/activate",
  requirePermission(PERMISSIONS.USER_SUSPEND),
  asyncHandler(userController.activate),
);

export const userRouter = router;
