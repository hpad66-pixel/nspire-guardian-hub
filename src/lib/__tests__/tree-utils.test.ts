/**
 * Unit tests for tree-utils (used by LocationPicker + CostCodeLibraryEditor).
 *
 *   - Happy: forest of mixed depths flattens in DFS order.
 *   - Validation: orphan parent_id is treated as a root; self-loop doesn't infinite-loop.
 *   - Permission: pure logic, nothing to gate.
 */
import { describe, it, expect } from "vitest";
import { buildTree, flattenTree } from "@/lib/tree-utils";

const rows = [
  { id: "a", parent_id: null, name: "Level 1A" },
  { id: "a1", parent_id: "a", name: "Level 2A1" },
  { id: "a2", parent_id: "a", name: "Level 2A2" },
  { id: "a1x", parent_id: "a1", name: "Level 3A1x" },
  { id: "b", parent_id: null, name: "Level 1B" },
];

describe("buildTree", () => {
  it("returns roots with their children nested", () => {
    const tree = buildTree(rows);
    expect(tree).toHaveLength(2);
    const a = tree.find((t) => t.node.id === "a")!;
    expect(a.depth).toBe(0);
    expect(a.children.map((c) => c.node.id)).toEqual(["a1", "a2"]);
    expect(a.children[0].depth).toBe(1);
    expect(a.children[0].children[0].node.id).toBe("a1x");
    expect(a.children[0].children[0].depth).toBe(2);
  });

  it("treats orphan parent_ids as roots", () => {
    const orphans = [
      { id: "x", parent_id: "does-not-exist", name: "Lost" },
      { id: "y", parent_id: null, name: "Root" },
    ];
    const tree = buildTree(orphans);
    expect(tree).toHaveLength(2);
    expect(tree.map((t) => t.node.id).sort()).toEqual(["x", "y"]);
  });

  it("breaks self-loops without recursing forever", () => {
    const loop = [{ id: "x", parent_id: "x", name: "loopy" }];
    const tree = buildTree(loop);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toEqual([]);
  });
});

describe("flattenTree", () => {
  it("returns nodes in depth-first order", () => {
    const tree = buildTree(rows);
    const flat = flattenTree(tree);
    expect(flat.map((n) => n.node.id)).toEqual(["a", "a1", "a1x", "a2", "b"]);
  });

  it("honors a collapsed set", () => {
    const tree = buildTree(rows);
    const flat = flattenTree(tree, new Set(["a1"]));
    // a1 itself is included, but its child a1x is hidden.
    expect(flat.map((n) => n.node.id)).toEqual(["a", "a1", "a2", "b"]);
  });
});
