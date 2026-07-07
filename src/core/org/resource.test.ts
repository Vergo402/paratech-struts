import { describe, it, expect } from 'vitest';
import type { ShorePoint } from '../schema/shorepoint';
import type { OrgResourceRef } from '../schema/org';
import { buildDefaultTree, defaultPositionId } from './defaultTree';
import {
  leaderOf,
  myApparatusKeys,
  positionForResource,
  positionForShorePoint,
  shorePointCountsByPosition,
  shorePointsForResource,
} from './resource';

const id = (k: Parameters<typeof defaultPositionId>[1]) => defaultPositionId('op1', k);
const rescue2: OrgResourceRef = { ref: 'apparatus', value: 'app-r2', label: 'Rescue 2' };

function sp(over: Partial<ShorePoint>): ShorePoint {
  return {
    id: 's',
    opId: 'op1',
    division: '1',
    shoreType: 'T-shore',
    measurementEighths: 0,
    deductions: {},
    status: 'pending',
    ...over,
  } as unknown as ShorePoint;
}

describe('Operations ↔ Command resource link', () => {
  it('leaderOf is the first assigned resource', () => {
    const tree = buildDefaultTree('op1');
    expect(leaderOf(tree[id('rescue')]!)).toBeNull();
    tree[id('rescue')]!.assignedResources = [rescue2, { ref: 'individual', value: 'FF Lopez', label: 'FF Lopez' }];
    expect(leaderOf(tree[id('rescue')]!)).toEqual(rescue2);
  });

  it('positionForResource finds a unit’s command home', () => {
    const tree = buildDefaultTree('op1');
    tree[id('rescue')]!.assignedResources = [rescue2];
    expect(positionForResource(tree, rescue2)!.id).toBe(id('rescue'));
  });

  it('positionForShorePoint maps a card’s assigned unit to its Group', () => {
    const tree = buildDefaultTree('op1');
    tree[id('rescue')]!.assignedResources = [rescue2];
    expect(positionForShorePoint(tree, sp({ assignedResource: 'Rescue 2' }))!.id).toBe(id('rescue'));
    expect(positionForShorePoint(tree, sp({ assignedResource: 'Engine 9' }))).toBeNull();
    expect(positionForShorePoint(tree, sp({ assignedResource: undefined }))).toBeNull();
  });

  it('shorePointsForResource returns the live points a unit is working', () => {
    const pts = [
      sp({ id: 'a', assignedResource: 'Rescue 2' }),
      sp({ id: 'b', assignedResource: 'Rescue 2', deletedAt: 123 }), // deleted → excluded
      sp({ id: 'c', assignedResource: 'Engine 9' }), //                other unit → excluded
      sp({ id: 'd', assignedResource: 'app-r2' }), //                 matches by value too
    ];
    expect(shorePointsForResource(pts, rescue2).map((p) => p.id)).toEqual(['a', 'd']);
  });

  it('myApparatusKeys resolves a device’s Mine-lens apparatus via its declared position', () => {
    const tree = buildDefaultTree('op1');
    tree[id('rescue')]!.assignedResources = [rescue2, { ref: 'individual', value: 'FF Lopez', label: 'FF Lopez' }];
    expect(myApparatusKeys(tree, id('rescue'))).toEqual(['Rescue 2', 'app-r2']);
  });

  it('myApparatusKeys handles multiple apparatus on one position (e.g. Staging)', () => {
    const tree = buildDefaultTree('op1');
    const engine9: OrgResourceRef = { ref: 'apparatus', value: 'app-e9', label: 'Engine 9' };
    tree[id('rescue')]!.assignedResources = [rescue2, engine9];
    expect(myApparatusKeys(tree, id('rescue'))).toEqual(['Rescue 2', 'app-r2', 'Engine 9', 'app-e9']);
  });

  it('myApparatusKeys is empty when My Role is unset, unknown, or holds no apparatus', () => {
    const tree = buildDefaultTree('op1');
    expect(myApparatusKeys(tree, null)).toEqual([]);
    expect(myApparatusKeys(tree, undefined)).toEqual([]);
    expect(myApparatusKeys(tree, 'not-a-real-position')).toEqual([]);
    tree[id('rescue')]!.assignedResources = [{ ref: 'individual', value: 'FF Lopez', label: 'FF Lopez' }];
    expect(myApparatusKeys(tree, id('rescue'))).toEqual([]);
  });
});

describe('shorePointCountsByPosition — assignment numerals (#434)', () => {
  const engine3: OrgResourceRef = { ref: 'apparatus', value: 'app-e3', label: 'Engine 3' };

  it('tallies a unit’s points onto its position by label OR value key', () => {
    const tree = buildDefaultTree('op1');
    tree[id('shoring')]!.assignedResources = [engine3];
    const pts = [
      sp({ id: 'a', assignedResource: 'Engine 3' }), //  label key
      sp({ id: 'b', assignedResource: 'app-e3' }), //    value key
      sp({ id: 'c', assignedResource: 'Engine 9' }), //  unassigned unit → nowhere
    ];
    expect(shorePointCountsByPosition(tree, pts)).toEqual({ [id('shoring')]: 2 });
  });

  it('excludes deleted points but INCLUDES returned ones (the figure is a total)', () => {
    const tree = buildDefaultTree('op1');
    tree[id('shoring')]!.assignedResources = [engine3];
    const pts = [
      sp({ id: 'a', assignedResource: 'Engine 3', status: 'returned' }),
      sp({ id: 'b', assignedResource: 'Engine 3', deletedAt: 5 }),
    ];
    expect(shorePointCountsByPosition(tree, pts)).toEqual({ [id('shoring')]: 1 });
  });

  it('never double-counts when a ref’s label equals its value', () => {
    const tree = buildDefaultTree('op1');
    tree[id('shoring')]!.assignedResources = [{ ref: 'apparatus', value: 'Engine 3', label: 'Engine 3' }];
    expect(shorePointCountsByPosition(tree, [sp({ id: 'a', assignedResource: 'Engine 3' })])).toEqual({
      [id('shoring')]: 1,
    });
  });

  it('sums across several apparatus on one position; individuals don’t count', () => {
    const tree = buildDefaultTree('op1');
    tree[id('staging')]!.assignedResources = [
      engine3,
      rescue2,
      { ref: 'individual', value: 'FF Lopez', label: 'FF Lopez' },
    ];
    const pts = [
      sp({ id: 'a', assignedResource: 'Engine 3' }),
      sp({ id: 'b', assignedResource: 'Rescue 2' }),
      sp({ id: 'c', assignedResource: 'FF Lopez' }), // individual, not apparatus → not tallied
    ];
    expect(shorePointCountsByPosition(tree, pts)).toEqual({ [id('staging')]: 2 });
  });

  it('omits zero-count positions entirely (the node hides the line at 0)', () => {
    const tree = buildDefaultTree('op1');
    tree[id('shoring')]!.assignedResources = [engine3];
    expect(shorePointCountsByPosition(tree, [])).toEqual({});
    expect(shorePointCountsByPosition(tree, [sp({ id: 'a' })])).toEqual({});
  });

  it('credits a dual-homed rig to its FIRST position only (cross-foot contract)', () => {
    // Anomalous under unity of command, but the numerals must never sum above the
    // incident total: one point → exactly one node, not both.
    const tree = buildDefaultTree('op1');
    tree[id('shoring')]!.assignedResources = [engine3]; // first in Object.values order
    tree[id('staging')]!.assignedResources = [engine3];
    const counts = shorePointCountsByPosition(tree, [sp({ id: 'a', assignedResource: 'Engine 3' })]);
    expect(counts).toEqual({ [id('shoring')]: 1 });
    const summed = Object.values(counts).reduce((a, n) => a + n, 0);
    expect(summed).toBe(1); // never 2
  });
});
