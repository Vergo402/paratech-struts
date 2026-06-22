import { describe, it, expect } from 'vitest';
import type { ChecklistInstance } from './reducer';
import { isLeaf, leavesOf, sectionProgress, isLeafChecked, isComplete } from './progress';
import { BASELINE_TEMPLATES } from './baseline';

const ic = BASELINE_TEMPLATES['ic-command'];
const phase1 = ic.nodes.find((n) => n.id === 'ic-p1')!;
const phase2 = ic.nodes.find((n) => n.id === 'ic-p2')!;

const inst = (ids: string[]): ChecklistInstance =>
  Object.fromEntries(ids.map((id) => [id, { by: 'd', role: 'Incident Commander', at: 1 }]));

describe('checklist progress (derived, never set)', () => {
  it('classifies leaves vs sections', () => {
    expect(isLeaf(phase1)).toBe(false); // has children
    const leaf = phase2.children!.find((n) => n.id === 'ic-p2-safety')!;
    expect(isLeaf(leaf)).toBe(true);
  });

  it('flattens leaves across nesting depth (3 levels under Phase I)', () => {
    // Phase I -> 2 sub-sections -> 3 + 2 leaves = 5 leaves
    expect(leavesOf(phase1).map((l) => l.id)).toEqual([
      'ic-p1-assess-location',
      'ic-p1-assess-hazards',
      'ic-p1-assess-victims',
      'ic-p1-command-post',
      'ic-p1-command-perimeter',
    ]);
  });

  it('rolls up a derived count over a deep section', () => {
    expect(sectionProgress(phase1, inst([]))).toEqual({ checked: 0, total: 5 });
    expect(sectionProgress(phase1, inst(['ic-p1-assess-location', 'ic-p1-command-post']))).toEqual({
      checked: 2,
      total: 5,
    });
  });

  it('isComplete is true only when every leaf is checked', () => {
    const allP2 = leavesOf(phase2).map((l) => l.id);
    expect(isComplete(phase2, inst([]))).toBe(false);
    expect(isComplete(phase2, inst(allP2.slice(0, -1)))).toBe(false);
    expect(isComplete(phase2, inst(allP2))).toBe(true);
  });

  it('reads a single leaf check', () => {
    const leaf = phase2.children!.find((n) => n.id === 'ic-p2-safety')!;
    expect(isLeafChecked(leaf, inst(['ic-p2-safety']))).toBe(true);
    expect(isLeafChecked(leaf, inst([]))).toBe(false);
  });
});
