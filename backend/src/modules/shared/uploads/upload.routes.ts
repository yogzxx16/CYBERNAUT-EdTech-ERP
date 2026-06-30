import { Router, type Request, type Response } from "express";
import { authenticate } from "../../../middlewares/auth.middleware";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { ApiResponse } from "../../../utils/apiResponse";
import { ApiError } from "../../../utils/apiError";
import { auditService } from "../../enterprise/audit/audit.service";
import { activityService } from "../../enterprise/activities/activity.service";
import type { Role } from "../../../config/constants";
import {
  deleteUpload,
  makeUploader,
  toUploadedDTO,
  type UploadKind,
} from "./upload.service";

const router = Router();
router.use(authenticate);

const KIND_WHITELIST: UploadKind[] = ["submissions", "attachments", "avatars"];
const uploaders: Record<UploadKind, ReturnType<typeof makeUploader>> = {
  submissions: makeUploader("submissions"),
  attachments: makeUploader("attachments"),
  avatars: makeUploader("avatars", { maxSizeMb: 5, maxFiles: 1 }),
};

router.post(
  "/:kind",
  (req, res, next) => {
    const kind = req.params.kind as UploadKind;
    if (!KIND_WHITELIST.includes(kind)) return next(ApiError.badRequest("Unknown upload kind"));
    uploaders[kind].array("files", 10)(req, res, next);
  },
  asyncHandler(async (req: Request, res: Response) => {
    const kind = req.params.kind as UploadKind;
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw ApiError.badRequest("No files uploaded");
    const zero = files.find((f) => f.size === 0);
    if (zero) throw ApiError.badRequest(`Empty file rejected: ${zero.originalname}`);
    const dtos = files.map((f) => toUploadedDTO(f, kind));
    const actor = req.user
      ? { id: req.user.id, role: req.user.role as Role }
      : undefined;
    if (actor) {
      await auditService.record({
        actor,
        action: "attachment.upload",
        entity: kind,
        summary: `Uploaded ${dtos.length} file(s) to ${kind}`,
        metadata: { files: dtos.map((d) => ({ name: d.originalName, size: d.size })) },
      });
      await activityService.record({
        actor,
        action: "attachment.upload",
        entity: "attachment",
        summary: `Uploaded ${dtos.length} file(s) to ${kind}`,
        metadata: { kind, files: dtos.map((d) => ({ name: d.originalName, size: d.size })) },
      });
    }
    return ApiResponse.created(res, dtos, "Uploaded");
  }),
);

router.delete(
  "/:kind/:filename",
  asyncHandler(async (req: Request, res: Response) => {
    const kind = req.params.kind as UploadKind;
    if (!KIND_WHITELIST.includes(kind)) throw ApiError.badRequest("Unknown upload kind");
    const removed = deleteUpload(kind, req.params.filename);
    if (!removed) throw ApiError.notFound("File not found");
    const actor = req.user
      ? { id: req.user.id, role: req.user.role as Role }
      : undefined;
    if (actor) {
      await auditService.record({
        actor,
        action: "attachment.delete",
        entity: kind,
        summary: `Deleted upload ${req.params.filename}`,
      });
    }
    return ApiResponse.ok(res, { removed: true }, "Removed");
  }),
);

export const uploadRouter = router;
