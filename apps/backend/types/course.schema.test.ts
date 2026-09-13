import { describe, expect, test } from "bun:test";
import { createCourseSchema, listCoursesQuery } from "./course.schema";

describe("course price", () => {
  const price = (v: unknown) => createCourseSchema.safeParse({ title: "A course", price: v });

  test("accepts a plain number", () => {
    const r = price(49);
    expect(r.success && r.data.price).toBe("49");
  });

  test("accepts two decimal places as a string", () => {
    const r = price("19.99");
    expect(r.success && r.data.price).toBe("19.99");
  });

  test("rejects three decimal places", () => {
    expect(price("19.999").success).toBe(false);
  });

  test("rejects a negative price", () => {
    expect(price(-1).success).toBe(false);
  });

  test("rejects a non-numeric price", () => {
    expect(price("free").success).toBe(false);
  });

  test("defaults to zero", () => {
    const r = createCourseSchema.safeParse({ title: "A course" });
    expect(r.success && r.data.price).toBe("0");
  });
});

describe("listCoursesQuery", () => {
  test("applies defaults", () => {
    const r = listCoursesQuery.safeParse({});
    expect(r.success && r.data).toMatchObject({ page: 1, limit: 20 });
  });

  test("coerces string params and caps limit", () => {
    expect(listCoursesQuery.safeParse({ page: "2", limit: "500" }).success).toBe(false);
    const r = listCoursesQuery.safeParse({ page: "2", limit: "50" });
    expect(r.success && r.data.page).toBe(2);
  });
});
