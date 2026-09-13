import { z } from "zod";

export const NODE_TYPES = [
  "FOLDER",
  "VIDEO",
  "PDF",
  "TEXT",
  "QUIZ",
  "ASSIGNMENT",
  "LINK",
] as const;

/**
 * FOLDER exists to hold other nodes; every other type carries learning content.
 * Only the latter count toward course progress.
 */
export const TRACKABLE_TYPES = NODE_TYPES.filter(t => t !== "FOLDER");

const title = z.string().trim().min(1, "Title is required.").max(200);
const parentId = z.string().min(1).nullable().optional();

/**
 * Each node type carries exactly one kind of payload, so creation is a
 * discriminated union rather than a bag of optional columns the caller may
 * fill in any combination.
 */
export const createNodeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("FOLDER"), title, parentId }),
  z.object({
    type: z.literal("VIDEO"),
    title,
    parentId,
    videoUrl: z.url("videoUrl must be a valid URL."),
    duration: z.number().int().positive().max(86_400).optional(),
  }),
  z.object({ type: z.literal("PDF"), title, parentId, pdfUrl: z.url("pdfUrl must be a valid URL.") }),
  z.object({ type: z.literal("TEXT"), title, parentId, text: z.string().min(1).max(100_000) }),
  z.object({ type: z.literal("LINK"), title, parentId, link: z.url("link must be a valid URL.") }),
  z.object({ type: z.literal("QUIZ"), title, parentId, text: z.string().max(100_000).optional() }),
  z.object({
    type: z.literal("ASSIGNMENT"),
    title,
    parentId,
    text: z.string().max(100_000).optional(),
  }),
]);

/**
 * Update covers edits, moves (parentId) and reordering (order) in one PATCH,
 * which keeps the API resource-oriented instead of sprouting /move and /reorder.
 *
 * `type` is intentionally immutable: changing it would orphan the payload column
 * the node was created with. Delete and recreate instead.
 */
export const updateNodeSchema = z
  .object({
    title,
    parentId,
    order: z.number().int().min(0).max(10_000),
    videoUrl: z.url().nullable(),
    pdfUrl: z.url().nullable(),
    text: z.string().max(100_000).nullable(),
    link: z.url().nullable(),
    duration: z.number().int().positive().max(86_400).nullable(),
  })
  .partial()
  .refine(v => Object.keys(v).length > 0, "Provide at least one field to update.");

export const nodeParams = z.object({ nodeId: z.string().min(1) });
export const courseNodeParams = z.object({ courseId: z.string().min(1) });

export type CreateNodeInput = z.infer<typeof createNodeSchema>;
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;
