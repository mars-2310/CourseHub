import { S3Client } from "bun";
import { randomUUID } from "node:crypto";
import { env } from "../lib/env";
import { serviceUnavailable, unprocessable } from "../utils/errors";
import { UPLOAD_KINDS, type SignUploadInput } from "../types/upload.schema";
import type { Organisation, User } from "../lib/generated/prisma/client";
import prisma from "../lib/prisma";

/**
 * Direct-to-storage uploads.
 *
 * The backend only ever issues a short-lived signed PUT; the bytes go straight
 * from the browser to the bucket. Proxying video through Express would tie up a
 * request handler for the length of the transfer and cap file size at whatever
 * the process can buffer.
 *
 * Any S3-compatible provider works (AWS S3, Cloudflare R2, MinIO), so the
 * storage decision stays reversible.
 */
const SIGNED_URL_TTL_SECONDS = 600;

function client(): S3Client {
  const { bucket, accessKeyId, secretAccessKey, endpoint, region } = env.s3;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw serviceUnavailable(
      "Object storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.",
    );
  }
  return new S3Client({ bucket, accessKeyId, secretAccessKey, endpoint, region });
}

export const isConfigured = (): boolean =>
  Boolean(env.s3.bucket && env.s3.accessKeyId && env.s3.secretAccessKey);

/** Strips path separators and exotic characters from a client-supplied name. */
function safeExtension(filename: string): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(filename.trim());
  return match ? `.${match[1]!.toLowerCase()}` : "";
}

export interface SignedUpload {
  uploadUrl: string;
  method: "PUT";
  key: string;
  publicUrl: string | null;
  contentType: string;
  expiresIn: number;
  maxBytes: number;
}

/**
 * Issues a signed upload for the caller's own academy.
 *
 * The object key is derived from the authenticated user's organisation, never
 * from the request, so a teacher cannot write into another academy's prefix.
 */
export async function signUpload(user: User, input: SignUploadInput): Promise<SignedUpload> {
  const organisation: Organisation | null = await prisma.organisation.findUnique({
    where: { ownerId: user.id },
  });
  if (!organisation) {
    throw unprocessable("Create an organisation before uploading files.");
  }

  const spec = UPLOAD_KINDS[input.kind];
  const key = `organisations/${organisation.id}/${input.kind}/${randomUUID()}${safeExtension(input.filename)}`;

  const uploadUrl = client().presign(key, {
    method: "PUT",
    expiresIn: SIGNED_URL_TTL_SECONDS,
    type: input.contentType,
  });

  return {
    uploadUrl,
    method: "PUT",
    key,
    // Set S3_PUBLIC_BASE_URL to the bucket's CDN origin to get a ready-made
    // URL for videoUrl / pdfUrl / thumbnail.
    publicUrl: env.s3.publicBaseUrl ? `${env.s3.publicBaseUrl.replace(/\/$/, "")}/${key}` : null,
    contentType: input.contentType,
    expiresIn: SIGNED_URL_TTL_SECONDS,
    maxBytes: spec.maxBytes,
  };
}
