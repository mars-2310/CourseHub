import { describe, expect, test } from "bun:test";
import { signUploadSchema, UPLOAD_KINDS } from "../types/upload.schema";

describe("signUploadSchema", () => {
  test("accepts an mp4 video", () => {
    const r = signUploadSchema.safeParse({
      kind: "video",
      filename: "lesson.mp4",
      contentType: "video/mp4",
    });
    expect(r.success).toBe(true);
  });

  test("rejects a content type that does not match the kind", () => {
    const r = signUploadSchema.safeParse({
      kind: "pdf",
      filename: "notes.pdf",
      contentType: "application/x-msdownload",
    });
    expect(r.success).toBe(false);
  });

  test("rejects an oversized pdf", () => {
    const r = signUploadSchema.safeParse({
      kind: "pdf",
      filename: "book.pdf",
      contentType: "application/pdf",
      size: UPLOAD_KINDS.pdf.maxBytes + 1,
    });
    expect(r.success).toBe(false);
  });

  test("rejects an unknown kind", () => {
    expect(
      signUploadSchema.safeParse({ kind: "executable", filename: "a", contentType: "text/plain" })
        .success,
    ).toBe(false);
  });
});

describe("presigning", () => {
  test("produces a signed PUT url scoped to the object key", async () => {
    const { S3Client } = await import("bun");
    const client = new S3Client({
      bucket: "coursehub-test",
      accessKeyId: "AKIAEXAMPLE",
      secretAccessKey: "secretexample",
      region: "us-east-1",
    });
    const url = client.presign("organisations/org_1/video/abc.mp4", {
      method: "PUT",
      expiresIn: 600,
      type: "video/mp4",
    });
    expect(url).toContain("organisations/org_1/video/abc.mp4");
    expect(url).toContain("X-Amz-Signature=");
    expect(url).toContain("X-Amz-Expires=600");
  });
});
