/**
 * Tree-building helpers used by LocationPicker, CostCodeLibraryEditor, and
 * the ProjectDirectory drawer. Pure functions — no React, no Supabase.
 */

export interface TreeRow {
  id: string;
  parent_id: string | null;
}

export interface TreeNode<T extends TreeRow> {
  node: T;
  children: TreeNode<T>[];
  depth: number;
}

/**
 * Build a forest of nested nodes from a flat list of rows with `id` +
 * `parent_id`. Rows whose parent isn't in the list are treated as roots.
 * Orphan cycles (`a.parent=b, b.parent=a`) are broken by treating the first
 * one visited as a root.
 */
export function buildTree<T extends TreeRow>(rows: T[]): TreeNode<T>[] {
  const byId = new Map<string, TreeNode<T>>();
  for (const row of rows) {
    byId.set(row.id, { node: row, children: [], depth: 0 });
  }
  const roots: TreeNode<T>[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const node = byId.get(row.id)!;
    if (seen.has(row.id)) continue;
    if (row.parent_id && byId.has(row.parent_id) && row.parent_id !== row.id) {
      const parent = byId.get(row.parent_id)!;
      parent.children.push(node);
      node.depth = parent.depth + 1;
      seen.add(row.id);
    } else {
      roots.push(node);
      seen.add(row.id);
    }
  }
  return roots;
}

/**
 * Flatten a tree back into an array in depth-first visit order, keeping the
 * `depth` hint on each entry. Nodes whose id is in `collapsed` still appear,
 * but their children are skipped.
 */
export function flattenTree<T extends TreeRow>(
  roots: TreeNode<T>[],
  collapsed?: Set<string>,
): TreeNode<T>[] {
  const out: TreeNode<T>[] = [];
  const walk = (nodes: TreeNode<T>[]) => {
    for (const node of nodes) {
      out.push(node);
      if (!collapsed || !collapsed.has(node.node.id)) {
        walk(node.children);
      }
    }
  };
  walk(roots);
  return out;
}
