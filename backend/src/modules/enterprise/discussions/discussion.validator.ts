import { z } from "zod";

export const createDiscussionSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional(),
  project: z.string().optional(),
  participants: z.array(z.string()).default([]),
  attachments: z.array(z.string().trim().url()).default([]),
});

export const updateDiscussionSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  closed: z.boolean().optional(),
});

export const participantsSchema = z.object({
  participants: z.array(z.string()).min(1),
});

export const postMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  attachments: z.array(z.string().trim().url()).optional(),
});

export const editMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const listDiscussionSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  project: z.string().optional(),
  participant: z.string().optional(),
  closed: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => (typeof v === "string" ? v === "true" : v)),
  scope: z.enum(["mine", "all"]).optional(),
  sort: z.string().optional(),
});

export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;
export type UpdateDiscussionInput = z.infer<typeof updateDiscussionSchema>;
export type ParticipantsInput = z.infer<typeof participantsSchema>;
export type PostMessageInput = z.infer<typeof postMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type ListDiscussionQuery = z.infer<typeof listDiscussionSchema>;
