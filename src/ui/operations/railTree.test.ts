import { describe, it, expect } from 'vitest';
import { buildRailTree, isLeafScope } from './railTree';
import type { ShorePoint } from '@core/schema';

function sp(over: Partial<ShorePoint> & { id: string }): ShorePoint {
  return {
    opId: 'op-1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 480,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status: 'pending',
    ...over,
  };
}

describe('buildRailTree', () => {
  it('excludes deleted points from counts and nodes', () => {
    const tree = buildRailTree([
      sp({ id: 'a', division: '1' }),
      sp({ id: 'b', division: '1', deletedAt: 123 }),
    ]);
    expect(tree.total).toBe(1);
    expect(tree.divisions).toHaveLength(1);
    expect(tree.divisions[0]!.count).toBe(1);
  });

  it('single-building: divisions at top level, ordered descending (top floor first)', () => {
    const tree = buildRailTree([
      sp({ id: 'a', division: '1' }),
      sp({ id: 'b', division: '3' }),
      sp({ id: 'c', division: '2' }),
    ]);
    expect(tree.multiBuilding).toBe(false);
    expect(tree.divisions.map((d) => d.division)).toEqual(['3', '2', '1']);
  });

  it('nests areas under a division, ordered ascending, with counts', () => {
    const tree = buildRailTree([
      sp({ id: 'a', division: '2', area: 'B' }),
      sp({ id: 'b', division: '2', area: 'A' }),
      sp({ id: 'c', division: '2', area: 'A' }),
      sp({ id: 'd', division: '2' }), // no area — counts toward division, no area node
    ]);
    const div = tree.divisions[0]!;
    expect(div.count).toBe(4);
    expect(div.areas).toEqual([
      { area: 'A', count: 2 },
      { area: 'B', count: 1 },
    ]);
  });

  it('multi-building: buildings at top level, each with its own divisions', () => {
    const tree = buildRailTree([
      sp({ id: 'a', building: 'North', division: '1' }),
      sp({ id: 'b', building: 'North', division: '2' }),
      sp({ id: 'c', building: 'South', division: '1' }),
    ]);
    expect(tree.multiBuilding).toBe(true);
    expect(tree.buildings.map((b) => b.building)).toEqual(['North', 'South']);
    expect(tree.buildings[0]!.count).toBe(2);
    expect(tree.buildings[0]!.divisions.map((d) => d.division)).toEqual(['2', '1']);
    expect(tree.buildings[1]!.divisions[0]!.division).toBe('1');
  });
});

describe('isLeafScope', () => {
  // single-building tree: Div 2 has areas A+B; Div 1 has none.
  const single = buildRailTree([
    sp({ id: 'a', division: '2', area: 'A' }),
    sp({ id: 'b', division: '2', area: 'B' }),
    sp({ id: 'c', division: '1' }),
  ]);
  // multi-building tree: North has divisions; South has a division too.
  const multi = buildRailTree([
    sp({ id: 'a', building: 'North', division: '2', area: 'A' }),
    sp({ id: 'b', building: 'North', division: '1' }),
    sp({ id: 'c', building: 'South', division: '1' }),
  ]);

  it('an area path is always a leaf', () => {
    expect(isLeafScope({ building: null, division: '2', area: 'A' }, single)).toBe(true);
  });
  it('a division with areas is NOT a leaf (keep drilling)', () => {
    expect(isLeafScope({ building: null, division: '2', area: null }, single)).toBe(false);
  });
  it('a division with no areas IS a leaf', () => {
    expect(isLeafScope({ building: null, division: '1', area: null }, single)).toBe(true);
  });
  it('a building with divisions is NOT a leaf', () => {
    expect(isLeafScope({ building: 'North', division: null, area: null }, multi)).toBe(false);
  });
  it('a division-with-area under a building is NOT a leaf at division level', () => {
    expect(isLeafScope({ building: 'North', division: '2', area: null }, multi)).toBe(false);
    expect(isLeafScope({ building: 'North', division: '1', area: null }, multi)).toBe(true);
  });
  it('the root ("All", all null) is never a leaf', () => {
    expect(isLeafScope({ building: null, division: null, area: null }, single)).toBe(false);
  });
});
