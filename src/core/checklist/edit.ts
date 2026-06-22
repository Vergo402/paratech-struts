import type { ChecklistNode } from '../schema';

// Pure, immutable edits for the department checklist editor (#230, ADR-020). Every
// function returns a NEW nodes array; the store persists the forked result. Node ids
// are stable across edits (attestations key on them). The tree is fully
// reorganizable — a step (or a whole section) moves anywhere via moveBefore (drag)
// or nudge (keyboard), never delete-and-re-add. No React, no data layer.

// ---- add / rename / remove ------------------------------------------------

/** Append `node` under `parentId` (a section), or at the root when parentId is null. */
export function addChild(nodes: ChecklistNode[], parentId: string | null, node: ChecklistNode): ChecklistNode[] {
  if (parentId === null) return [...nodes, node];
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: [...(n.children ?? []), node] };
    if (n.children) return { ...n, children: addChild(n.children, parentId, node) };
    return n;
  });
}

/** Rename the node with `id`, wherever it is. */
export function renameNode(nodes: ChecklistNode[], id: string, label: string): ChecklistNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, label };
    if (n.children) return { ...n, children: renameNode(n.children, id, label) };
    return n;
  });
}

/** Remove the node with `id` (and its subtree), wherever it is. */
export function removeNode(nodes: ChecklistNode[], id: string): ChecklistNode[] {
  return nodes.filter((n) => n.id !== id).map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n));
}

// ---- flatten (the editor's flat render + drop targeting) ------------------

export interface FlatRow {
  id: string;
  label: string;
  depth: number;
  isSection: boolean;
  parentId: string | null;
}

/** Depth-first rows with depth + parent — what the editor renders and hit-tests. */
export function flattenWithMeta(nodes: ChecklistNode[], parentId: string | null = null, depth = 0): FlatRow[] {
  return nodes.flatMap((n) => {
    const isSection = n.children !== undefined;
    const row: FlatRow = { id: n.id, label: n.label, depth, isSection, parentId };
    return isSection ? [row, ...flattenWithMeta(n.children ?? [], n.id, depth + 1)] : [row];
  });
}

// ---- internal tree helpers ------------------------------------------------

function contains(node: ChecklistNode, id: string): boolean {
  return node.id === id || (node.children ?? []).some((c) => contains(c, id));
}

/** Detach the subtree rooted at `id`. Returns [tree without it, the detached node]. */
function extract(nodes: ChecklistNode[], id: string): [ChecklistNode[], ChecklistNode | null] {
  let found: ChecklistNode | null = null;
  const walk = (arr: ChecklistNode[]): ChecklistNode[] => {
    const out: ChecklistNode[] = [];
    for (const n of arr) {
      if (n.id === id) {
        found = n;
        continue;
      }
      out.push(n.children ? { ...n, children: walk(n.children) } : n);
    }
    return out;
  };
  return [walk(nodes), found];
}

/** Insert `node` immediately before `beforeId`; beforeId null → append at root end. */
function insertBefore(nodes: ChecklistNode[], beforeId: string | null, node: ChecklistNode): ChecklistNode[] {
  if (beforeId === null) return [...nodes, node];
  const walk = (arr: ChecklistNode[]): ChecklistNode[] => {
    const idx = arr.findIndex((n) => n.id === beforeId);
    if (idx !== -1) {
      const out = [...arr];
      out.splice(idx, 0, node);
      return out;
    }
    return arr.map((n) => (n.children ? { ...n, children: walk(n.children) } : n));
  };
  return walk(nodes);
}

/** Insert `node` into section `sectionId` at the start or end of its children. */
function insertInto(nodes: ChecklistNode[], sectionId: string, node: ChecklistNode, where: 'start' | 'end'): ChecklistNode[] {
  return nodes.map((n) => {
    if (n.id === sectionId) {
      const children = n.children ?? [];
      return { ...n, children: where === 'start' ? [node, ...children] : [...children, node] };
    }
    if (n.children) return { ...n, children: insertInto(n.children, sectionId, node, where) };
    return n;
  });
}

/** Locate a node: its parent id, index among siblings, and that sibling array. */
function locate(nodes: ChecklistNode[], id: string, parentId: string | null = null): { parentId: string | null; index: number; siblings: ChecklistNode[] } | null {
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx !== -1) return { parentId, index: idx, siblings: nodes };
  for (const n of nodes) {
    if (n.children) {
      const hit = locate(n.children, id, n.id);
      if (hit) return hit;
    }
  }
  return null;
}

// ---- public moves ---------------------------------------------------------

/** Move the subtree `id` so it sits immediately before `beforeId` (drag drop);
 *  beforeId null appends it at the root end. Reparents freely — a step lands in
 *  whatever section `beforeId` lives in. A no-op if you'd drop a node into its own
 *  subtree (beforeId is inside id). */
export function moveBefore(nodes: ChecklistNode[], id: string, beforeId: string | null): ChecklistNode[] {
  if (id === beforeId) return nodes;
  const [removed, node] = extract(nodes, id);
  if (!node) return nodes;
  if (beforeId !== null && contains(node, beforeId)) return nodes; // can't move into own subtree
  return insertBefore(removed, beforeId, node);
}

/** Move the subtree `id` INTO section `sectionId` (drop onto a section), at the
 *  start or end of its children. No-op if you'd drop it into its own subtree. */
export function moveInto(nodes: ChecklistNode[], id: string, sectionId: string, where: 'start' | 'end' = 'start'): ChecklistNode[] {
  if (id === sectionId) return nodes;
  const [removed, node] = extract(nodes, id);
  if (!node) return nodes;
  if (contains(node, sectionId)) return nodes;
  return insertInto(removed, sectionId, node, where);
}

/** The id of a node and all its descendants — the rows a drag must NOT target. */
export function subtreeIds(nodes: ChecklistNode[], id: string): string[] {
  const find = (arr: ChecklistNode[]): ChecklistNode | null => {
    for (const n of arr) {
      if (n.id === id) return n;
      if (n.children) {
        const hit = find(n.children);
        if (hit) return hit;
      }
    }
    return null;
  };
  const node = find(nodes);
  if (!node) return [id];
  const ids: string[] = [];
  const collect = (n: ChecklistNode) => {
    ids.push(n.id);
    (n.children ?? []).forEach(collect);
  };
  collect(node);
  return ids;
}

/** Keyboard reorder. Within a sibling group it swaps up/down; at a section
 *  boundary it FALLS THROUGH into the adjacent sibling-section (so a step at the
 *  bottom of one section steps into the top of the next) — full keyboard parity
 *  with the cross-section drag. A no-op at the very ends. */
export function nudge(nodes: ChecklistNode[], id: string, dir: 'up' | 'down'): ChecklistNode[] {
  const loc = locate(nodes, id);
  if (!loc) return nodes;
  const { parentId, index, siblings } = loc;

  if (dir === 'up') {
    if (index > 0) return swapAt(nodes, parentId, index, index - 1);
    const prev = adjacentSiblingSection(nodes, parentId, 'prev');
    if (!prev) return nodes;
    const [removed, node] = extract(nodes, id);
    return node ? insertInto(removed, prev, node, 'end') : nodes;
  }
  if (index < siblings.length - 1) return swapAt(nodes, parentId, index, index + 1);
  const next = adjacentSiblingSection(nodes, parentId, 'next');
  if (!next) return nodes;
  const [removed, node] = extract(nodes, id);
  return node ? insertInto(removed, next, node, 'start') : nodes;
}

/** Swap two siblings at `parentId` by index — used by nudge within a group. */
function swapAt(nodes: ChecklistNode[], parentId: string | null, a: number, b: number): ChecklistNode[] {
  if (parentId === null) {
    const next = [...nodes];
    [next[a], next[b]] = [next[b]!, next[a]!];
    return next;
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      const children = [...(n.children ?? [])];
      [children[a], children[b]] = [children[b]!, children[a]!];
      return { ...n, children };
    }
    if (n.children) return { ...n, children: swapAt(n.children, parentId, a, b) };
    return n;
  });
}

/** The section immediately before/after the node `parentId` among ITS siblings —
 *  where a boundary nudge falls through to. Null if there is none. */
function adjacentSiblingSection(nodes: ChecklistNode[], parentId: string | null, dir: 'prev' | 'next'): string | null {
  if (parentId === null) return null; // root-level node has no enclosing section to leave
  const parentLoc = locate(nodes, parentId);
  if (!parentLoc) return null;
  const { siblings, index } = parentLoc;
  const step = dir === 'prev' ? -1 : 1;
  for (let i = index + step; i >= 0 && i < siblings.length; i += step) {
    if (siblings[i]!.children !== undefined) return siblings[i]!.id; // a section
  }
  return null;
}
