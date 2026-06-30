import { z } from "zod";

const mongoObjectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Valid employee ObjectId is required");
const optionalMongoObjectIdSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  mongoObjectIdSchema.optional(),
);

export const generateSalarySchema = z
  .object({
    employee: optionalMongoObjectIdSchema,
    employeeId: optionalMongoObjectIdSchema,
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(2100),
    baseSalary: z.coerce.number().min(0).optional(),
    workingDays: z.coerce.number().min(1).max(31).default(22),
    leaveDays: z.coerce.number().min(0).default(0),
    deductions: z.coerce.number().min(0).default(0),
    bonus: z.coerce.number().min(0).default(0),
    remarks: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.employee && !data.employeeId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["employee"], message: "Employee is required" });
    }
  })
  .transform((data) => {
    const employeeId = data.employeeId ?? data.employee!;
    return { ...data, employee: employeeId, employeeId };
  });

export const listSalarySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  employee: z.string().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z.enum(["draft", "finalized", "all"]).optional(),
  scope: z.enum(["mine", "all"]).optional(),
  sort: z.string().optional(),
});

export type GenerateSalaryInput = z.infer<typeof generateSalarySchema>;
export type ListSalaryQuery = z.infer<typeof listSalarySchema>;
