import { describe, expect, test } from "bun:test";
import { buildTree, deepestFirst, isDescendantOf, subtreeIds } from "./tree";

/**
 * Course
 * ├── intro
 * │   ├── welcome
 * │   └── syllabus
 * └── dsa
 *     └── arrays
 *         └── theory
 *             └── video
 */
const rows = [
  { id: "intro", parentId: null, order: 0 },
  { id: "dsa", parentId: null, order: 1 },
  { id: "welcome", parentId: "intro", order: 0 },
  { id: "syllabus", parentId: "intro", order: 1 },
  { id: "arrays", parentId: "dsa", order: 0 },
  { id: "theory", parentId: "arrays", order: 0 },
  { id: "video", parentId: "theory", order: 0 },
];

describe("subtreeIds", () => {
  test("collects a node and all descendants", () => {
    expect(subtreeIds(rows, "dsa").sort()).toEqual(["arrays", "dsa", "theory", "video"]);
  });

  test("a leaf is its own subtree", () => {
    expect(subtreeIds(rows, "welcome")).toEqual(["welcome"]);
  });
});

describe("deepestFirst", () => {
  test("never returns a parent before its own child", () => {
    const ordered = deepestFirst(rows).map(r => r.id);
    for (const row of rows) {
      if (!row.parentId) continue;
      expect(ordered.indexOf(row.id)).toBeLessThan(ordered.indexOf(row.parentId));
    }
  });

  test("terminates on a malformed cycle instead of hanging", () => {
    const cyclic = [
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
    ];
    expect(deepestFirst(cyclic)).toHaveLength(2);
  });
});

describe("isDescendantOf — cycle prevention", () => {
  test("detects a deep ancestor", () => {
    // Moving "dsa" under "video" would make dsa its own descendant.
    expect(isDescendantOf(rows, "video", "dsa")).toBe(true);
  });

  test("a node is trivially its own ancestor", () => {
    expect(isDescendantOf(rows, "dsa", "dsa")).toBe(true);
  });

  test("allows a legitimate sideways move", () => {
    // Moving "welcome" under "arrays" is fine: arrays is not inside welcome.
    expect(isDescendantOf(rows, "arrays", "welcome")).toBe(false);
  });

  test("unrelated branches are not ancestors", () => {
    expect(isDescendantOf(rows, "intro", "dsa")).toBe(false);
  });
});

describe("buildTree", () => {
  test("nests to arbitrary depth", () => {
    const tree = buildTree(rows) as any[];
    expect(tree.map(n => n.id)).toEqual(["intro", "dsa"]);
    expect(tree[1].children[0].children[0].children[0].id).toBe("video");
  });

  test("orders siblings by order, not insertion", () => {
    const shuffled = [
      { id: "b", parentId: null, order: 1 },
      { id: "c", parentId: null, order: 2 },
      { id: "a", parentId: null, order: 0 },
    ];
    expect((buildTree(shuffled) as any[]).map(n => n.id)).toEqual(["a", "b", "c"]);
  });
});
