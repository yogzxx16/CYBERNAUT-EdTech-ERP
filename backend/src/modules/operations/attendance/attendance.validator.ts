import { z } from "zod";

export const checkInSchema = z.object({
  at: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const checkOutSchema = z.object({
  at: z.coerce.date().optional(),
});

export const markAttendanceSchema = z.object({
  employee: z.string().regex(/^[0-9a-fA-F]{24}$/),
  date: z.coerce.date(),
  status: z.enum(["present", "absent", "half_day", "leave"]),
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const listAttendanceSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(30),
  employee: z.string().optional(),
  status: z.enum(["present", "absent", "half_day", "leave", "all"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.string().optional(),
  scope: z.enum(["mine", "all"]).optional(),
});

export const summarySchema = z.object({
  employee: z.string().optional(),
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type ListAttendanceQuery = z.infer<typeof listAttendanceSchema>;
export type SummaryQuery = z.infer<typeof summarySchema>;
