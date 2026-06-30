import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { notificationController } from "./notification.controller";

const router = Router();
router.use(authenticate);
router.get("/", asyncHandler(notificationController.list));
router.get("/unread-count", asyncHandler(notificationController.unreadCount));
router.post("/read-all", asyncHandler(notificationController.markAllRead));
router.post("/:id/read", asyncHandler(notificationController.markRead));
export const notificationRouter = router;
