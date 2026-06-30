import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { salaryController } from "./salary.controller";
import { generateSalarySchema, listSalarySchema } from "./salary.validator";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission(PERMISSIONS.SALARY_VIEW),
  validate(listSalarySchema, "query"),
  asyncHandler(salaryController.list),
);
router.get(
  "/:id",
  requirePermission(PERMISSIONS.SALARY_VIEW),
  asyncHandler(salaryController.getOne),
);
router.post(
  "/",
  requirePermission(PERMISSIONS.SALARY_GENERATE),
  validate(generateSalarySchema),
  asyncHandler(salaryController.generate),
);

export const salaryRouter = router;
