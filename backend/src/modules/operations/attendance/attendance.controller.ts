import type { Request, Response } from "express";
import { ApiResponse } from "../../../utils/apiResponse";
import { attendanceService } from "./attendance.service";
import type {
  CheckInInput,
  CheckOutInput,
  ListAttendanceQuery,
  MarkAttendanceInput,
  SummaryQuery,
} from "./attendance.validator";
import type { Role } from "../../../config/constants";

function actor(req: Request) {
  return { id: req.user!.id, role: req.user!.role as Role };
}

export const attendanceController = {
  async checkIn(req: Request, res: Response) {
    const dto = await attendanceService.checkIn(req.body as CheckInInput, actor(req));
    return ApiResponse.ok(res, dto, "Checked in");
  },
  async checkOut(req: Request, res: Response) {
    const dto = await attendanceService.checkOut(req.body as CheckOutInput, actor(req));
    return ApiResponse.ok(res, dto, "Checked out");
  },
  async mark(req: Request, res: Response) {
    const dto = await attendanceService.mark(req.body as MarkAttendanceInput, actor(req));
    return ApiResponse.ok(res, dto, "Attendance recorded");
  },
  async today(req: Request, res: Response) {
    const dto = await attendanceService.today({ id: req.user!.id });
    return ApiResponse.ok(res, dto, "OK");
  },
  async list(req: Request, res: Response) {
    const q = req.query as unknown as ListAttendanceQuery;
    const result = await attendanceService.list(q, actor(req));
    return res.status(200).json({
      success: true,
      message: "OK",
      data: result.items,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  },
  async summary(req: Request, res: Response) {
    const q = req.query as unknown as SummaryQuery;
    const dto = await attendanceService.summary(q, actor(req));
    return ApiResponse.ok(res, dto, "OK");
  },
};
