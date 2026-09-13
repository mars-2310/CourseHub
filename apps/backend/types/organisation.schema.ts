import { z } from "zod";
import { SLUG_PATTERN } from "../utils/slug";

const slug = z
  .string()
  .trim()
  .min(3, "Slug must be at least 3 characters.")
  .max(50)
  .regex(SLUG_PATTERN, "Slug may contain lowercase letters, numbers and hyphens only.");

export const createOrganisationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  // Optional: derived from the name when omitted.
  slug: slug.optional(),
  description: z.string().trim().max(2000).optional(),
  logo: z.url("Logo must be a valid URL.").optional(),
});

export const updateOrganisationSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug,
    description: z.string().trim().max(2000).nullable(),
    logo: z.url().nullable(),
  })
  .partial()
  .refine(v => Object.keys(v).length > 0, "Provide at least one field to update.");

export const organisationParams = z.object({ id: z.string().min(1) });

export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;
export type UpdateOrganisationInput = z.infer<typeof updateOrganisationSchema>;
