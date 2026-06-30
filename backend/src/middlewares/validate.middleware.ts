import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

export type Source = "body" | "query" | "params";

export function validate<T extends z.ZodTypeAny>(schema: T, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    // overwrite with parsed (coerced) value
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
