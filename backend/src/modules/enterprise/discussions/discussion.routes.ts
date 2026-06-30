import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { discussionController } from "./discussion.controller";
import {
  createDiscussionSchema,
  editMessageSchema,
  listDiscussionSchema,
  participantsSchema,
  postMessageSchema,
  updateDiscussionSchema,
} from "./discussion.validator";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission(PERMISSIONS.DISCUSSION_VIEW),
  validate(listDiscussionSchema, "query"),
  asyncHandler(discussionController.list),
);
router.get(
  "/:id",
  requirePermission(PERMISSIONS.DISCUSSION_VIEW),
  asyncHandler(discussionController.getOne),
);
router.post(
  "/",
  requirePermission(PERMISSIONS.DISCUSSION_CREATE),
  validate(createDiscussionSchema),
  asyncHandler(discussionController.create),
);
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.DISCUSSION_CREATE),
  validate(updateDiscussionSchema),
  asyncHandler(discussionController.update),
);
router.put(
  "/:id/participants",
  requirePermission(PERMISSIONS.DISCUSSION_CREATE),
  validate(participantsSchema),
  asyncHandler(discussionController.setParticipants),
);
router.post(
  "/:id/messages",
  requirePermission(PERMISSIONS.DISCUSSION_PARTICIPATE),
  validate(postMessageSchema),
  asyncHandler(discussionController.postMessage),
);
router.patch(
  "/:id/messages/:messageId",
  requirePermission(PERMISSIONS.DISCUSSION_PARTICIPATE),
  validate(editMessageSchema),
  asyncHandler(discussionController.editMessage),
);

export const discussionRouter = router;
