/**
 * Environment access.
 *
 * Bun loads `.env` automatically. Required variables are asserted at boot so the
 * process fails loudly at startup rather than on the first request that needs them.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See apps/backend/.env.example.`,
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  port: Number(process.env.PORT ?? 5001),
  nodeEnv: process.env.NODE_ENV ?? "development",

  databaseUrl: required("DATABASE_URL"),

  // @clerk/express reads these from the environment itself; we assert them here
  // so a misnamed key fails at boot instead of 500-ing every route.
  clerkPublishableKey: required("CLERK_PUBLISHABLE_KEY"),
  clerkSecretKey: required("CLERK_SECRET_KEY"),

  corsOrigin: process.env.CORS_ORIGIN ?? "*",

  // Object storage (S3-compatible: AWS S3, Cloudflare R2, MinIO, ...).
  // Optional: upload endpoints report 503 until these are configured.
  s3: {
    bucket: optional("S3_BUCKET"),
    accessKeyId: optional("S3_ACCESS_KEY_ID"),
    secretAccessKey: optional("S3_SECRET_ACCESS_KEY"),
    endpoint: optional("S3_ENDPOINT"),
    region: optional("S3_REGION"),
    publicBaseUrl: optional("S3_PUBLIC_BASE_URL"),
  },
} as const;

export const isProduction = env.nodeEnv === "production";
