import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional(),
  venue: z.string().trim().max(200).optional(),
  eventDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  participants: z.array(z.string()).default([]),
});

export const updateEventSchema = createEventSchema.partial().extend({
  status: z.enum(["scheduled", "ongoing", "completed", "cancelled"]).optional(),
});

export const rsvpSchema = z.object({
  status: z.enum(["yes", "no", "maybe"]),
});

export const listEventSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().optional(),
  status: z.enum(["scheduled", "ongoing", "completed", "cancelled", "all"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type RSVPInput = z.infer<typeof rsvpSchema>;
export type ListEventQuery = z.infer<typeof listEventSchema>;
