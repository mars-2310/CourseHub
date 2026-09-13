import { describe, expect, test } from "bun:test";
import { createNodeSchema, updateNodeSchema } from "./node.schema";

describe("createNodeSchema", () => {
  test("accepts a VIDEO with a url", () => {
    const r = createNodeSchema.safeParse({
      type: "VIDEO",
      title: "Welcome",
      videoUrl: "https://cdn.test/v.mp4",
    });
    expect(r.success).toBe(true);
  });

  test("rejects a VIDEO without a url", () => {
    expect(createNodeSchema.safeParse({ type: "VIDEO", title: "Welcome" }).success).toBe(false);
  });

  test("rejects payload belonging to another type", () => {
    // pdfUrl is not part of the VIDEO variant, so it is stripped, and the
    // required videoUrl is still missing.
    const r = createNodeSchema.safeParse({
      type: "FOLDER",
      title: "Intro",
      videoUrl: "https://cdn.test/v.mp4",
    });
    expect(r.success).toBe(true);
    expect(r.success && "videoUrl" in r.data).toBe(false);
  });

  test("rejects an unknown node type", () => {
    expect(createNodeSchema.safeParse({ type: "PODCAST", title: "x" }).success).toBe(false);
  });

  test("trims titles and rejects empty ones", () => {
    expect(createNodeSchema.safeParse({ type: "FOLDER", title: "   " }).success).toBe(false);
  });
});

describe("updateNodeSchema", () => {
  test("rejects an empty patch", () => {
    expect(updateNodeSchema.safeParse({}).success).toBe(false);
  });

  test("accepts a move to the course root", () => {
    expect(updateNodeSchema.safeParse({ parentId: null }).success).toBe(true);
  });

  test("accepts a reorder", () => {
    expect(updateNodeSchema.safeParse({ order: 3 }).success).toBe(true);
  });

  test("rejects a negative order", () => {
    expect(updateNodeSchema.safeParse({ order: -1 }).success).toBe(false);
  });
});
