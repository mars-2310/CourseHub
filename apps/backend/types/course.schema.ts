import { z } from "zod";

/**
 * Money arrives as a number or a numeric string and leaves as a fixed-precision
 * string, which is what Prisma's Decimal accepts without a float round-trip.
 */
const money = z
  .union([z.number(), z.string()])
  .transform((v, ctx) => {
    const raw = typeof v === "number" ? v.toString() : v.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
      ctx.addIssue({ code: "custom", message: "Price must be a non-negative amount with at most 2 decimal places." });
      return z.NEVER;
    }
    if (Number(raw) > 99_999_999) {
      ctx.addIssue({ code: "custom", message: "Price is too large." });
      return z.NEVER;
    }
    return raw;
  });

export const createCourseSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(150),
  description: z.string().trim().max(5000).optional(),
  thumbnail: z.url("Thumbnail must be a valid URL.").optional(),
  price: money.optional().default("0"),
});

export const updateCourseSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().max(5000).nullable(),
    thumbnail: z.url().nullable(),
    price: money,
  })
  .partial()
  .refine(v => Object.keys(v).length > 0, "Provide at least one field to update.");

export const courseParams = z.object({ courseId: z.string().min(1) });

export const listCoursesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).max(100).optional(),
  organizationId: z.string().min(1).optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuery>;
