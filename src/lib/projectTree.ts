// Pure project-hierarchy utilities — the single source every feature reads from,
// so financials, dashboard, and cockpit all roll subprojects up the SAME way
// instead of each re-implementing (and drifting on) the tree math.

export interface TreeNode {
  id: string;
  parent_project_id?: string | null;
}

export interface ProjectTree<T extends TreeNode> {
  byId: Map<string, T>;
  roots: T[];                       // top-level (no parent, or parent not in set)
  children: (id: string) => T[];    // direct children
  descendants: (id: string) => T[]; // all below, excludes self
  subtree: (id: string) => T[];     // all below, INCLUDES self
  ancestors: (id: string) => T[];   // parent chain, nearest-first
  path: (id: string) => T[];        // root → … → self (breadcrumb order)
  depth: (id: string) => number;    // 0 = top level
  hasChildren: (id: string) => boolean;
  /** Sum a numeric metric across a node's whole subtree (self + descendants). */
  rollup: (id: string, metric: (t: T) => number) => number;
}

export function buildProjectTree<T extends TreeNode>(items: T[]): ProjectTree<T> {
  const byId = new Map<string, T>();
  for (const it of items) byId.set(it.id, it);

  const childrenById = new Map<string, T[]>();
  const roots: T[] = [];
  for (const it of items) {
    const pid = it.parent_project_id;
    if (pid && byId.has(pid)) {
      const arr = childrenById.get(pid) ?? [];
      arr.push(it);
      childrenById.set(pid, arr);
    } else {
      roots.push(it);
    }
  }

  const children = (id: string) => childrenById.get(id) ?? [];

  const subtree = (id: string): T[] => {
    const out: T[] = [];
    const seen = new Set<string>();
    const walk = (nid: string) => {
      if (seen.has(nid)) return; // cycle guard (DB prevents, but be safe)
      seen.add(nid);
      const node = byId.get(nid);
      if (node) out.push(node);
      for (const c of children(nid)) walk(c.id);
    };
    walk(id);
    return out;
  };

  const descendants = (id: string) => subtree(id).filter((n) => n.id !== id);

  const ancestors = (id: string): T[] => {
    const out: T[] = [];
    const seen = new Set<string>([id]);
    let cur = byId.get(id)?.parent_project_id ?? null;
    while (cur && byId.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      const node = byId.get(cur)!;
      out.push(node);
      cur = node.parent_project_id ?? null;
    }
    return out;
  };

  const path = (id: string) => {
    const self = byId.get(id);
    const chain = ancestors(id).reverse();
    return self ? [...chain, self] : chain;
  };

  const depth = (id: string) => ancestors(id).length;
  const hasChildren = (id: string) => (childrenById.get(id)?.length ?? 0) > 0;
  const rollup = (id: string, metric: (t: T) => number) =>
    subtree(id).reduce((sum, n) => sum + (metric(n) || 0), 0);

  return { byId, roots, children, descendants, subtree, ancestors, path, depth, hasChildren, rollup };
}
