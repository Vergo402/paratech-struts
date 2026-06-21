import { describe, it, expect } from 'vitest';
import { buildDefaultTree, defaultPositionId } from './defaultTree';
import { rootPosition, childrenOf } from './tree';

describe('buildDefaultTree (ADR-008 seeded chart)', () => {
  const tree = buildDefaultTree('op1');
  const all = Object.values(tree);

  it('seeds exactly the 7 default nodes, all builtIn', () => {
    expect(all).toHaveLength(7);
    expect(all.every((p) => p.builtIn)).toBe(true);
  });

  it('Incident Commander is the sole root', () => {
    const roots = all.filter((p) => p.parentId === null);
    expect(roots).toHaveLength(1);
    expect(roots[0]!.kind).toBe('command');
    expect(roots[0]!.title).toBe('Incident Commander');
    expect(rootPosition(tree)).toBe(roots[0]);
  });

  it('Safety Officer is command-staff under the IC; Operations is a section', () => {
    const ic = rootPosition(tree)!;
    const safety = tree[defaultPositionId('op1', 'safety')]!;
    const ops = tree[defaultPositionId('op1', 'ops')]!;
    expect(safety.kind).toBe('command-staff');
    expect(safety.parentId).toBe(ic.id);
    expect(ops.kind).toBe('section');
    expect(ops.parentId).toBe(ic.id);
  });

  it('Cutting Station is a workstation, not a command box; Groups under Operations', () => {
    const ops = tree[defaultPositionId('op1', 'ops')]!;
    expect(tree[defaultPositionId('op1', 'cutting')]!.kind).toBe('workstation');
    expect(tree[defaultPositionId('op1', 'rescue')]!.kind).toBe('group');
    expect(tree[defaultPositionId('op1', 'shoring')]!.kind).toBe('group');
    expect(tree[defaultPositionId('op1', 'staging')]!.kind).toBe('staging');
    expect(childrenOf(tree, ops.id).map((p) => p.title)).toEqual([
      'Rescue Group Supervisor',
      'Shoring Group Supervisor',
      'Staging Area Manager',
      'Cutting Station',
    ]);
  });

  it('ids are DETERMINISTIC from opId (two devices fold identical ids)', () => {
    expect(Object.keys(buildDefaultTree('op1'))).toEqual(Object.keys(tree));
    expect(defaultPositionId('op1', 'ic')).toBe('op1:pos-ic');
    // different op → different ids (no collision across operations)
    expect(Object.keys(buildDefaultTree('op2'))).not.toEqual(Object.keys(tree));
  });

  it('returns independent objects each call (no shared frozen refs)', () => {
    const a = buildDefaultTree('op1');
    const b = buildDefaultTree('op1');
    expect(a).not.toBe(b);
    expect(a[defaultPositionId('op1', 'ic')]).not.toBe(b[defaultPositionId('op1', 'ic')]);
  });
});
