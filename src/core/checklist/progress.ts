import type { ChecklistNode } from '../schema';
import type { ChecklistInstance } from './reducer';

// Pure derivation over a template node + an instance's attestations. The
// leaf-vs-section rule lives here: a section's state is ALWAYS computed from its
// leaves, never set (nested-checklist.md). No React, no data layer.

/** A node with no children is a checkable leaf; with children, a roll-up section. */
export function isLeaf(node: ChecklistNode): boolean {
  return !node.children || node.children.length === 0;
}

/** All leaf descendants of a node (the node itself when it is a leaf). */
export function leavesOf(node: ChecklistNode): ChecklistNode[] {
  return isLeaf(node) ? [node] : (node.children ?? []).flatMap(leavesOf);
}

export interface Progress {
  checked: number;
  total: number;
}

/** Derived "checked / total" over a node's leaves — the section's count badge. */
export function sectionProgress(node: ChecklistNode, inst: ChecklistInstance): Progress {
  const leaves = leavesOf(node);
  let checked = 0;
  for (const l of leaves) if (inst[l.id]) checked++;
  return { checked, total: leaves.length };
}

/** A single leaf's checked state (has an attestation). */
export function isLeafChecked(node: ChecklistNode, inst: ChecklistInstance): boolean {
  return Boolean(inst[node.id]);
}

/** True when every leaf under the node is checked (a 100%-complete section). */
export function isComplete(node: ChecklistNode, inst: ChecklistInstance): boolean {
  const { checked, total } = sectionProgress(node, inst);
  return total > 0 && checked === total;
}
