import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { attendanceController } from "./attendance.controller";
import {
  checkInSchema,
  checkOutSchema,
  listAttendanceSchema,
  markAttendanceSchema,
  summarySchema,
} from "./attendance.validator";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission(PERMISSIONS.ATTENDANCE_VIEW),
  validate(listAttendanceSchema, "query"),
  asyncHandler(attendanceController.list),
);
router.get(
  "/summary",
  requirePermission(PERMISSIONS.ATTENDANCE_VIEW),
  validate(summarySchema, "query"),
  asyncHandler(attendanceController.summary),
);
router.get(
  "/today",
  requirePermission(PERMISSIONS.ATTENDANCE_VIEW),
  asyncHandler(attendanceController.today),
);
router.post(
  "/check-in",
  requirePermission(PERMISSIONS.ATTENDANCE_MARK),
  validate(checkInSchema),
  asyncHandler(attendanceController.checkIn),
);
router.post(
  "/check-out",
  requirePermission(PERMISSIONS.ATTENDANCE_MARK),
  validate(checkOutSchema),
  asyncHandler(attendanceController.checkOut),
);
router.post(
  "/mark",
  requirePermission(PERMISSIONS.ATTENDANCE_MANAGE),
  validate(markAttendanceSchema),
  asyncHandler(attendanceController.mark),
);

export const attendanceRouter = router;
