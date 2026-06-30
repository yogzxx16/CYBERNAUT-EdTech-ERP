import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { activityController } from "./activity.controller";
import { listActivitiesSchema } from "./activity.validator";

const router = Router();
router.use(authenticate);
router.get("/", validate(listActivitiesSchema, "query"), asyncHandler(activityController.list));
router.get("/:entity/:entityId", asyncHandler(activityController.forEntity));
export const activityRouter = router;
