import type { OrgPosition, OrgPositions } from '../schema/org';

const GUARD = 1000; // cycle/runaway backstop (a real chart is O(tens) of nodes)

export function positionById(positions: OrgPositions, id: string): OrgPosition | undefined {
  return positions[id];
}

// The single root (Incident Commander), or undefined before seeding.
export function rootPosition(positions: OrgPositions): OrgPosition | undefined {
  return Object.values(positions).find((p) => p.parentId === null);
}

// Direct reports of `parentId`, in sibling order (ties broken by id for determinism
// — two concurrent inserts with the same fractional order still fold identically).
export function childrenOf(positions: OrgPositions, parentId: string | null): OrgPosition[] {
  return Object.values(positions)
    .filter((p) => p.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

// Every descendant id of `id` (excluding self), BFS. Used by PositionRemoved to drop
// a whole subtree in one event.
export function subtreeIds(positions: OrgPositions, id: string): string[] {
  const out: string[] = [];
  const queue: string[] = [id];
  const seen = new Set<string>([id]);
  let guard = 0;
  while (queue.length && guard++ < GUARD) {
    const cur = queue.shift() as string;
    for (const child of childrenOf(positions, cur)) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push(child.id);
      queue.push(child.id);
    }
  }
  return out;
}

// Is `ancestorId` an ancestor of `nodeId` (or the same node)? Walk up from nodeId.
// The cycle guard for reparent: moving `positionId` under `newParentId` is illegal
// iff isAncestorOrSelf(positions, positionId, newParentId) — i.e. the new parent is
// in positionId's own subtree. Checked in the reducer, so it survives replay.
export function isAncestorOrSelf(positions: OrgPositions, ancestorId: string, nodeId: string): boolean {
  let cur: string | null = nodeId;
  let guard = 0;
  while (cur != null && guard++ < GUARD) {
    if (cur === ancestorId) return true;
    cur = positions[cur]?.parentId ?? null;
  }
  return false;
}

export function wouldCreateCycle(positions: OrgPositions, positionId: string, newParentId: string): boolean {
  return isAncestorOrSelf(positions, positionId, newParentId);
}

// Root-first path to `id` (the breadcrumb on phone tap-to-descend).
export function pathToRoot(positions: OrgPositions, id: string): OrgPosition[] {
  const path: OrgPosition[] = [];
  let cur: string | null = id;
  let guard = 0;
  while (cur != null && guard++ < GUARD) {
    const p: OrgPosition | undefined = positions[cur];
    if (!p) break;
    path.push(p);
    cur = p.parentId;
  }
  return path.reverse();
}

export function siblingsOf(positions: OrgPositions, id: string): OrgPosition[] {
  const p = positions[id];
  if (!p) return [];
  return childrenOf(positions, p.parentId).filter((s) => s.id !== id);
}
