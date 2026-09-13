import { z } from "zod";

/**
 * Upload kinds and what each may actually contain.
 *
 * The allowlist is enforced server-side because the signed URL is a capability:
 * once handed out, whatever the client PUTs lands in the bucket. Content type
 * and size are pinned into the signature rather than trusted afterwards.
 */
export const UPLOAD_KINDS = {
  video: {
    contentTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"],
    maxBytes: 2 * 1024 * 1024 * 1024, // 2 GB
  },
  pdf: {
    contentTypes: ["application/pdf"],
    maxBytes: 50 * 1024 * 1024, // 50 MB
  },
  image: {
    contentTypes: ["image/png", "image/jpeg", "image/webp", "image/avif"],
    maxBytes: 10 * 1024 * 1024, // 10 MB
  },
} as const;

export type UploadKind = keyof typeof UPLOAD_KINDS;

export const signUploadSchema = z
  .object({
    kind: z.enum(["video", "pdf", "image"]),
    filename: z.string().trim().min(1).max(255),
    contentType: z.string().trim().min(1).max(150),
    size: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    const spec = UPLOAD_KINDS[value.kind];
    if (!(spec.contentTypes as readonly string[]).includes(value.contentType)) {
      ctx.addIssue({
        code: "custom",
        path: ["contentType"],
        message: `${value.contentType} is not allowed for ${value.kind}. Allowed: ${spec.contentTypes.join(", ")}.`,
      });
    }
    if (value.size !== undefined && value.size > spec.maxBytes) {
      ctx.addIssue({
        code: "custom",
        path: ["size"],
        message: `${value.kind} uploads are limited to ${Math.floor(spec.maxBytes / 1024 / 1024)} MB.`,
      });
    }
  });

export type SignUploadInput = z.infer<typeof signUploadSchema>;
