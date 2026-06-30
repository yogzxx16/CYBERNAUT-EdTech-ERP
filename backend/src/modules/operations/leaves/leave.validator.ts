import { z } from "zod";

export const createLeaveSchema = z.object({
  leaveType: z.enum(["casual", "sick", "earned", "unpaid", "maternity", "paternity"]),
  reason: z.string().trim().min(3).max(1000),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const updateLeaveSchema = z.object({
  leaveType: z.enum(["casual", "sick", "earned", "unpaid", "maternity", "paternity"]).optional(),
  reason: z.string().trim().min(3).max(1000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const decideLeaveSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().trim().max(500).optional(),
});

export const listLeavesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  employee: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected", "cancelled", "all"]).optional(),
  leaveType: z
    .enum(["casual", "sick", "earned", "unpaid", "maternity", "paternity", "all"])
    .optional(),
  search: z.string().trim().optional(),
  sort: z.string().optional(),
  scope: z.enum(["mine", "all"]).optional(),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type UpdateLeaveInput = z.infer<typeof updateLeaveSchema>;
export type DecideLeaveInput = z.infer<typeof decideLeaveSchema>;
export type ListLeavesQuery = z.infer<typeof listLeavesSchema>;
