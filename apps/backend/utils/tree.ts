/** Minimal shape the tree helpers need; works for any ContentNode selection. */
export interface TreeRow {
  id: string;
  parentId: string | null;
}

/**
 * Orders nodes deepest-first.
 *
 * The ContentNode parent relation has no ON DELETE CASCADE, so a bulk delete
 * would violate the foreign key the moment a parent is removed before its
 * children. Deleting in this order keeps every intermediate state valid.
 */
export function deepestFirst<T extends TreeRow>(rows: T[]): T[] {
  const byId = new Map(rows.map(r => [r.id, r]));

  const depthOf = (row: T): number => {
    let depth = 0;
    let cursor: T | undefined = row;
    // Bounded by the row count, so a malformed cycle cannot hang the process.
    while (cursor?.parentId && depth <= rows.length) {
      cursor = byId.get(cursor.parentId) as T | undefined;
      depth++;
    }
    return depth;
  };

  return [...rows].sort((a, b) => depthOf(b) - depthOf(a));
}

/** Collects a node and every descendant of it, from a flat row set. */
export function subtreeIds<T extends TreeRow>(rows: T[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    childrenOf.set(row.parentId, [...(childrenOf.get(row.parentId) ?? []), row.id]);
  }

  const collected: string[] = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    if (collected.includes(id)) continue; // defensive: tolerate a malformed cycle
    collected.push(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }
  return collected;
}

/**
 * Walks up from `startId` to the root, reporting whether `targetId` is an
 * ancestor. Used to reject a move that would make a node its own descendant.
 */
export function isDescendantOf<T extends TreeRow>(
  rows: T[],
  startId: string,
  targetId: string,
): boolean {
  const byId = new Map(rows.map(r => [r.id, r]));
  let cursor = byId.get(startId);
  let guard = 0;
  while (cursor && guard++ <= rows.length) {
    if (cursor.id === targetId) return true;
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return false;
}

/** Assembles a nested tree from flat rows, ordering siblings by `order`. */
export function buildTree<T extends TreeRow & { order: number }>(
  rows: T[],
): (T & { children: unknown[] })[] {
  const wrapped = new Map(rows.map(r => [r.id, { ...r, children: [] as unknown[] }]));
  const roots: (T & { children: unknown[] })[] = [];

  for (const row of rows) {
    const node = wrapped.get(row.id)!;
    const parent = row.parentId ? wrapped.get(row.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRecursive = (nodes: { order: number; children: unknown[] }[]) => {
    nodes.sort((a, b) => a.order - b.order);
    for (const n of nodes) sortRecursive(n.children as { order: number; children: unknown[] }[]);
  };
  sortRecursive(roots);

  return roots;
}
