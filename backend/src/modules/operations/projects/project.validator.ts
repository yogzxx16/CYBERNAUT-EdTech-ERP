import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const dateOrder = (data: { startDate?: Date; endDate?: Date }) =>
  !data.startDate || !data.endDate || data.endDate.getTime() >= data.startDate.getTime();

export const createProjectSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(2000).optional(),
    department: objectId.optional(),
    projectManager: objectId,
    assignedEmployees: z.array(objectId).optional().default([]),
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["planning", "in_progress", "on_hold", "completed"]).default("planning"),
    completionPercentage: z.coerce.number().min(0).max(100).default(0),
  })
  .refine(dateOrder, { message: "End date cannot be before start date", path: ["endDate"] });

export const updateProjectSchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(2000).optional(),
    department: objectId.optional(),
    projectManager: objectId.optional(),
    assignedEmployees: z.array(objectId).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["planning", "in_progress", "on_hold", "completed", "archived"]).optional(),
    completionPercentage: z.coerce.number().min(0).max(100).optional(),
  })
  .refine(dateOrder, { message: "End date cannot be before start date", path: ["endDate"] });

export const assignMembersSchema = z.object({
  userIds: z.array(objectId).min(1),
});

export const removeMemberSchema = z.object({
  userId: objectId,
});

export const updateProgressSchema = z.object({
  completionPercentage: z.coerce.number().min(0).max(100),
});

export const updateStatusSchema = z.object({
  status: z.enum(["planning", "in_progress", "on_hold", "completed", "archived"]),
});

const submissionAttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  originalName: z.string().max(255).optional(),
  url: z.string().min(1).max(1000),
  size: z.number().int().nonnegative().optional(),
  mimeType: z.string().max(120).optional(),
  extension: z.string().max(16).optional(),
});

export const submitProjectSchema = z.object({
  repoUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  liveUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  docsUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
  attachments: z.array(submissionAttachmentSchema).optional().default([]),
});

export const reviewProjectSchema = z
  .object({
    decision: z.enum(["approve", "reject", "request_changes"]),
    comments: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.decision !== "request_changes" || !!d.comments?.trim(), {
    message: "Comments are required when requesting changes",
    path: ["comments"],
  });

export const listProjectsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z
    .enum(["planning", "in_progress", "on_hold", "completed", "archived", "all"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical", "all"]).optional(),
  submissionStatus: z
    .enum(["none", "pending_review", "approved", "rejected", "changes_requested", "all"])
    .optional(),
  department: z.string().optional(),
  member: z.string().optional(),
  sort: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AssignMembersInput = z.infer<typeof assignMembersSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type SubmitProjectInput = z.infer<typeof submitProjectSchema>;
export type ReviewProjectInput = z.infer<typeof reviewProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsSchema>;
