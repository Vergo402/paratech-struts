import { describe, it, expect } from 'vitest';
import type { ShorePoint } from '../schema/shorepoint';
import type { OrgResourceRef } from '../schema/org';
import { buildDefaultTree, defaultPositionId } from './defaultTree';
import { leaderOf, positionForResource, positionForShorePoint, shorePointsForResource } from './resource';

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
});
