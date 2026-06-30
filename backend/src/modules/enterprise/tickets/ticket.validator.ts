import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(4000),
  category: z
    .enum(["technical", "hr", "payroll", "facilities", "access", "other"])
    .default("other"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

export const replyTicketSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  internal: z.boolean().optional(),
});

export const assignTicketSchema = z.object({
  assignedTo: z.string().min(1),
});

export const listTicketSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed", "all"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent", "all"]).optional(),
  category: z
    .enum(["technical", "hr", "payroll", "facilities", "access", "other", "all"])
    .optional(),
  scope: z.enum(["mine", "assigned", "all"]).optional(),
  sort: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type ReplyTicketInput = z.infer<typeof replyTicketSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type ListTicketQuery = z.infer<typeof listTicketSchema>;
