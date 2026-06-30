import { z } from "zod";
import { ROLE_LIST } from "../../../config/constants";

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(32).optional(),
  dob: z.coerce.date(),
  joiningDate: z.coerce.date().optional(),
  department: z.string().trim().min(1).optional(),
  role: z.enum(ROLE_LIST as [string, ...string[]]),
  designation: z.string().trim().max(120).optional(),
  address: z.string().trim().max(500).optional(),
  bio: z.string().trim().max(1000).optional(),
  salary: z.coerce.number().min(0).optional(),
  profileImage: z.string().max(500000).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(32).optional(),
  dob: z.coerce.date().optional(),
  joiningDate: z.coerce.date().optional(),
  department: z.string().trim().min(1).nullable().optional(),
  role: z.enum(ROLE_LIST as [string, ...string[]]).optional(),
  designation: z.string().trim().max(120).optional(),
  address: z.string().trim().max(500).optional(),
  bio: z.string().trim().max(1000).optional(),
  salary: z.coerce.number().min(0).optional(),
  profileImage: z.string().max(500000).optional(),
});

export const updateSelfProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(32).optional(),
  address: z.string().trim().max(500).optional(),
  bio: z.string().trim().max(1000).optional(),
  profileImage: z.string().max(500000).optional(),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(10),
  search: z.string().trim().optional(),
  role: z.enum([...ROLE_LIST, "all"] as unknown as [string, ...string[]]).optional(),
  status: z.enum(["active", "suspended", "invited", "all"]).optional(),
  department: z.string().optional(),
  sort: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateSelfProfileInput = z.infer<typeof updateSelfProfileSchema>;
export type ListUsersQuery = z.infer<typeof listUsersSchema>;
