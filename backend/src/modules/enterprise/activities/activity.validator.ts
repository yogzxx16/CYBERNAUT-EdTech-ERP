import { z } from "zod";

export const listActivitiesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  entity: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  actor: z.string().trim().optional(),
  action: z.string().trim().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListActivitiesQuery = z.infer<typeof listActivitiesSchema>;
