import { z } from "zod";

/**
 * Completion is idempotent and reversible: POSTing twice leaves the same state,
 * and `completed: false` un-marks a node the student opened by mistake.
 */
export const completeNodeSchema = z
  .object({ completed: z.boolean().default(true) })
  .default({ completed: true });

export type CompleteNodeInput = z.infer<typeof completeNodeSchema>;
