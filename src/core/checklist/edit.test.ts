import { describe, it, expect } from 'vitest';
import type { ChecklistNode } from '../schema';
import { addChild, renameNode, removeNode, flattenWithMeta, moveBefore, nudge } from './edit';
import { isLeaf, leavesOf } from './progress';

// Search[ a, b ]  Access[ c, d ]
const tree = (): ChecklistNode[] => [
  { id: 's1', label: 'Search', children: [{ id: 'a', label: 'Primary' }, { id: 'b', label: 'Mark' }] },
  { id: 's2', label: 'Access', children: [{ id: 'c', label: 'Route' }, { id: 'd', label: 'Shore' }] },
];

const stepsOf = (nodes: ChecklistNode[], sectionId: string) => nodes.find((n) => n.id === sectionId)!.children!.map((n) => n.id);

describe('checklist add / rename / remove', () => {
  it('addChild appends a step; an empty section is not a leaf', () => {
    expect(stepsOf(addChild(tree(), 's1', { id: 'x', label: 'Secondary' }), 's1')).toEqual(['a', 'b', 'x']);
    const withSec = addChild(tree(), null, { id: 's3', label: 'Extricate', children: [] });
    expect(isLeaf(withSec.find((n) => n.id === 's3')!)).toBe(false);
  });
  it('renameNode and removeNode reach anywhere', () => {
    expect(renameNode(tree(), 'a', 'Primary search')[0]!.children![0]!.label).toBe('Primary search');
    expect(removeNode(tree(), 's1').map((n) => n.id)).toEqual(['s2']);
    expect(stepsOf(removeNode(tree(), 'b'), 's1')).toEqual(['a']);
  });
});

describe('flattenWithMeta', () => {
  it('emits depth-first rows with depth + parent', () => {
    expect(flattenWithMeta(tree()).map((r) => `${r.id}@${r.depth}/${r.parentId ?? 'root'}`)).toEqual([
      's1@0/root', 'a@1/s1', 'b@1/s1', 's2@0/root', 'c@1/s2', 'd@1/s2',
    ]);
  });
});

describe('moveBefore — drag, fully cross-section', () => {
  it('moves a step into ANOTHER section, before the target step', () => {
    const next = moveBefore(tree(), 'a', 'd'); // Primary -> Access, before Shore
    expect(stepsOf(next, 's1')).toEqual(['b']);
    expect(stepsOf(next, 's2')).toEqual(['c', 'a', 'd']);
  });
  it('reorders sections when moved before another section', () => {
    expect(moveBefore(tree(), 's2', 's1').map((n) => n.id)).toEqual(['s2', 's1']);
  });
  it('a whole section travels with its steps', () => {
    const next = moveBefore(tree(), 's1', null); // Search -> end (after Access)
    expect(next.map((n) => n.id)).toEqual(['s2', 's1']);
    expect(stepsOf(next, 's1')).toEqual(['a', 'b']); // children intact
  });
  it('refuses to drop a node into its own subtree', () => {
    expect(moveBefore(tree(), 's1', 'a')).toEqual(tree()); // s1 before its own child a -> no-op
  });
});

describe('nudge — keyboard, crosses section boundaries', () => {
  it('swaps within a section when not at a boundary', () => {
    expect(stepsOf(nudge(tree(), 'a', 'down'), 's1')).toEqual(['b', 'a']);
  });
  it('falls DOWN out of the last slot into the next section top', () => {
    const next = nudge(tree(), 'b', 'down'); // Mark is last in Search -> top of Access
    expect(stepsOf(next, 's1')).toEqual(['a']);
    expect(stepsOf(next, 's2')).toEqual(['b', 'c', 'd']);
  });
  it('falls UP out of the first slot into the previous section bottom', () => {
    const next = nudge(tree(), 'c', 'up'); // Route is first in Access -> bottom of Search
    expect(stepsOf(next, 's2')).toEqual(['d']);
    expect(stepsOf(next, 's1')).toEqual(['a', 'b', 'c']);
  });
  it('no-ops at the very top and very bottom of the whole tree', () => {
    expect(nudge(tree(), 'a', 'up')).toEqual(tree()); // first step of first section
    expect(nudge(tree(), 'd', 'down')).toEqual(tree()); // last step of last section
  });
  it('does not mutate the input', () => {
    const t = tree();
    nudge(t, 'b', 'down');
    expect(stepsOf(t, 's1')).toEqual(['a', 'b']);
  });
});

describe('leavesOf still rolls up after edits', () => {
  it('counts leaves of a section', () => {
    expect(leavesOf(tree()[0]!).map((l) => l.id)).toEqual(['a', 'b']);
  });
});
