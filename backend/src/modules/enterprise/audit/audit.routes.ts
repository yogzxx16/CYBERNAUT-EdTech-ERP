import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { auditController } from "./audit.controller";
import { listAuditSchema } from "./audit.validator";

const router = Router();
router.use(authenticate);
router.get(
  "/",
  requirePermission(PERMISSIONS.AUDIT_VIEW),
  validate(listAuditSchema, "query"),
  asyncHandler(auditController.list),
);
export const auditRouter = router;
