import type { OrgPosition, OrgPositions } from '../schema/org';
import { childrenOf, subtreeIds } from './tree';

// Pure helpers for the reparent/reorder button-equivalents (the AT path — drag is a
// later desktop nicety). Each returns the value to put on the event, or null when
// the move is illegal (so the UI can disable the control with a reason).

/** Siblings of `id` (incl. itself) in render order. */
function siblings(positions: OrgPositions, id: string): OrgPosition[] {
  const p = positions[id];
  return p ? childrenOf(positions, p.parentId) : [];
}

/** The new fractional `order` to move `id` up one slot among its siblings, or null
 *  if already first. A midpoint keeps it a single-node write (concurrent-safe). */
export function orderForUp(positions: OrgPositions, id: string): number | null {
  const sibs = siblings(positions, id);
  const i = sibs.findIndex((s) => s.id === id);
  if (i <= 0) return null;
  const prev = sibs[i - 1]!;
  const prevPrev = sibs[i - 2];
  return prevPrev ? (prevPrev.order + prev.order) / 2 : prev.order - 1;
}

/** The new fractional `order` to move `id` down one slot, or null if already last. */
export function orderForDown(positions: OrgPositions, id: string): number | null {
  const sibs = siblings(positions, id);
  const i = sibs.findIndex((s) => s.id === id);
  if (i < 0 || i >= sibs.length - 1) return null;
  const next = sibs[i + 1]!;
  const nextNext = sibs[i + 2];
  return nextNext ? (next.order + nextNext.order) / 2 : next.order + 1;
}

/** Promote = become a sibling of your parent (reparent to the grandparent). Null if
 *  the parent is the root (no second root allowed) or the node is the root. */
export function promoteTarget(positions: OrgPositions, id: string): string | null {
  const p = positions[id];
  if (!p || p.parentId == null) return null; // root can't promote
  const parent = positions[p.parentId];
  if (!parent || parent.parentId == null) return null; // parent is root → grandparent is null
  return parent.parentId;
}

/** Demote = become a child of your previous sibling (reparent under it). Null if
 *  there is no previous sibling. */
export function demoteTarget(positions: OrgPositions, id: string): string | null {
  const sibs = siblings(positions, id);
  const i = sibs.findIndex((s) => s.id === id);
  if (i <= 0) return null;
  return sibs[i - 1]!.id;
}

/** Valid "Move under…" targets: every position except `id` and its own subtree
 *  (would create a cycle) and its current parent (no-op). */
export function validParentsFor(positions: OrgPositions, id: string): OrgPosition[] {
  const self = positions[id];
  if (!self) return [];
  const blocked = new Set<string>([id, ...subtreeIds(positions, id)]);
  return Object.values(positions).filter((p) => !blocked.has(p.id) && p.id !== self.parentId);
}

/** The `order` for a new child appended last under `parentId`. */
export function nextChildOrder(positions: OrgPositions, parentId: string): number {
  const kids = childrenOf(positions, parentId);
  return kids.length ? kids[kids.length - 1]!.order + 1 : 0;
}
