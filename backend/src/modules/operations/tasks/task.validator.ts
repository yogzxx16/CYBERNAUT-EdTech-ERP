import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const dateOrder = (data: { startDate?: Date; dueDate?: Date }) =>
  !data.startDate || !data.dueDate || data.dueDate.getTime() >= data.startDate.getTime();

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).optional(),
    project: objectId,
    assignees: z.array(objectId).min(1, "At least one assignee is required"),
    dependencies: z.array(objectId).optional().default([]),
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    startDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    status: z.enum(["pending", "in_progress", "review", "completed"]).default("pending"),
  })
  .refine(dateOrder, { message: "Due date cannot be before start date", path: ["dueDate"] });

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    assignees: z.array(objectId).optional(),
    dependencies: z.array(objectId).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    status: z.enum(["pending", "in_progress", "review", "completed"]).optional(),
    remarks: z.string().trim().max(1000).optional(),
  })
  .refine(
    (d) =>
      !d.startDate || !d.dueDate || (d.dueDate as Date).getTime() >= (d.startDate as Date).getTime(),
    { message: "Due date cannot be before start date", path: ["dueDate"] },
  );

export const updateTaskStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "review", "completed"]),
  remarks: z.string().trim().max(1000).optional(),
});

export const addCommentSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export const addAttachmentSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  fileUrl: z.string().trim().url().max(1000),
});

const submissionAttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  originalName: z.string().max(255).optional(),
  url: z.string().min(1).max(1000),
  size: z.number().int().nonnegative().optional(),
  mimeType: z.string().max(120).optional(),
  extension: z.string().max(16).optional(),
});

export const submitTaskSchema = z.object({
  repoUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  liveUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  docsUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
  attachments: z.array(submissionAttachmentSchema).optional().default([]),
});

export const reviewTaskSchema = z.object({
  decision: z.enum(["approve", "reject", "request_changes"]),
  comments: z.string().trim().max(2000).optional(),
}).refine((d) => d.decision !== "request_changes" || !!d.comments?.trim(), {
  message: "Comments are required when requesting changes",
  path: ["comments"],
});

export const listTasksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  project: z.string().optional(),
  assignedTo: z.string().optional(),
  createdBy: z.string().optional(),
  status: z.enum(["pending", "in_progress", "review", "completed", "all"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical", "all"]).optional(),
  submissionStatus: z
    .enum(["none", "pending_review", "approved", "rejected", "changes_requested", "all"])
    .optional(),
  dueFilter: z.enum(["today", "overdue", "tomorrow"]).optional(),
  mine: z.coerce.boolean().optional(),
  createdByMe: z.coerce.boolean().optional(),
  sort: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type AddAttachmentInput = z.infer<typeof addAttachmentSchema>;
export type SubmitTaskInput = z.infer<typeof submitTaskSchema>;
export type ReviewTaskInput = z.infer<typeof reviewTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksSchema>;
