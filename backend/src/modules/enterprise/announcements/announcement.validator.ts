import { z } from "zod";

const priorityEnum = z.enum(["low", "medium", "high", "critical"]);
const audienceEnum = z.enum(["all", "admins", "employees", "interns", "department"]);

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(5000),
  priority: priorityEnum.default("medium"),
  audience: audienceEnum.default("all"),
  department: z.string().optional(),
  expiryDate: z.coerce.date().optional(),
  attachments: z.array(z.string().trim().url()).default([]),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const listAnnouncementSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(["draft", "published", "archived", "all"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical", "all"]).optional(),
  audience: z.enum(["all", "admins", "employees", "interns", "department"]).optional(),
  sort: z.string().optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type ListAnnouncementQuery = z.infer<typeof listAnnouncementSchema>;
