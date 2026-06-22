import { describe, it, expect } from 'vitest';
import type { ShorePoint, ShorePointStatus, ShoreTypeId } from '../schema';
import { rollupByDivision } from './sitstat-rollup';

// Short shore-type words for the injected label fn (the UI owns the real catalog).
const TYPE: Record<ShoreTypeId, string> = { 't-shore': 'T-Shore', 'double-t': 'Double-T', '3-post': '3-Post' };
const typeLabel = (sp: ShorePoint) => TYPE[sp.shoreType];

let n = 0;
function sp(over: Partial<ShorePoint> & { division: string; status: ShorePointStatus }): ShorePoint {
  n += 1;
  return {
    id: over.id ?? `sp-${n}`,
    opId: 'op-1',
    seq: over.seq ?? n,
    shoreType: over.shoreType ?? 't-shore',
    measurementEighths: 800,
    deductions: {},
    ...over,
  } as ShorePoint;
}

describe('rollupByDivision', () => {
  it('returns no rows for an empty / all-deleted set', () => {
    const r = rollupByDivision([], typeLabel);
    expect(r.rows).toEqual([]);
    expect(r.grandTotal).toBe(0);
    expect(r.laggingDivision).toBeNull();

    const deleted = rollupByDivision([sp({ division: '1', status: 'pending', deletedAt: 1 })], typeLabel);
    expect(deleted.rows).toEqual([]);
    expect(deleted.grandTotal).toBe(0);
    expect(deleted.totals.pending).toBe(0);
  });

  it('skips soft-deleted points in every tally', () => {
    const r = rollupByDivision(
      [
        sp({ division: '2', status: 'pending' }),
        sp({ division: '2', status: 'pending', deletedAt: Date.now() }),
        sp({ division: '2', status: 'secured' }),
      ],
      typeLabel,
    );
    expect(r.grandTotal).toBe(2);
    const div2 = r.rows.find((x) => x.division === '2')!;
    expect(div2.total).toBe(2);
    expect(div2.counts.pending).toBe(1);
    expect(div2.counts.secured).toBe(1);
    expect(div2.pendingCount).toBe(1);
  });

  it('sorts rows top-floor-first (compareDivisionValues): roof above ground above basement', () => {
    const r = rollupByDivision(
      [
        sp({ division: '-1', status: 'pending' }), // basement
        sp({ division: '3', status: 'pending' }),
        sp({ division: '1', status: 'pending' }), // ground
      ],
      typeLabel,
    );
    expect(r.rows.map((x) => x.division)).toEqual(['3', '1', '-1']);
    expect(r.rows.map((x) => x.label)).toEqual(['Div 3', 'Div 1', 'Sub Div 1']);
  });

  it('the bottom totals equal the whole-incident tally', () => {
    const r = rollupByDivision(
      [
        sp({ division: '1', status: 'returned' }),
        sp({ division: '2', status: 'returned' }),
        sp({ division: '2', status: 'secured' }),
      ],
      typeLabel,
    );
    expect(r.grandTotal).toBe(3);
    expect(r.totals.returned).toBe(2);
    expect(r.totals.secured).toBe(1);
    // The row totals re-sum to the grand total.
    expect(r.rows.reduce((acc, x) => acc + x.total, 0)).toBe(r.grandTotal);
  });

  it('flags the Division with the most pending points as lagging', () => {
    const r = rollupByDivision(
      [
        sp({ division: '1', status: 'pending' }),
        sp({ division: '1', status: 'secured' }),
        sp({ division: '2', status: 'pending' }),
        sp({ division: '2', status: 'pending' }),
        sp({ division: '2', status: 'pending' }),
        sp({ division: '3', status: 'returned' }),
      ],
      typeLabel,
    );
    expect(r.laggingDivision).toBe('2');
  });

  it('breaks a pending tie by board order (top-floor row wins)', () => {
    const r = rollupByDivision(
      [
        sp({ division: '1', status: 'pending' }),
        sp({ division: '5', status: 'pending' }),
      ],
      typeLabel,
    );
    // Both have one pending; Div 5 sorts first (top floor) so it wins the tie.
    expect(r.laggingDivision).toBe('5');
  });

  it('clusters a grouped shore into one sub-row with per-status counts', () => {
    const r = rollupByDivision(
      [
        sp({ division: '1', status: 'cutting', shoreType: '3-post', groupId: 'g1', groupIndex: 1, groupTotal: 3 }),
        sp({ division: '1', status: 'cutting', shoreType: '3-post', groupId: 'g1', groupIndex: 2, groupTotal: 3 }),
        sp({ division: '1', status: 'runner', shoreType: '3-post', groupId: 'g1', groupIndex: 3, groupTotal: 3 }),
      ],
      typeLabel,
    );
    const div = r.rows[0]!;
    expect(div.groups).toHaveLength(1);
    const g = div.groups[0]!;
    expect(g.key).toBe('g1');
    expect(g.total).toBe(3);
    expect(g.counts.cutting).toBe(2);
    expect(g.counts.runner).toBe(1);
    expect(g.label).toBe('3-Post 1/3·2/3·3/3');
  });

  it('treats each solo (ungrouped) point as its own cluster keyed by id', () => {
    const r = rollupByDivision(
      [
        sp({ id: 'a', seq: 7, division: '2', status: 'pending', label: 'NW corner' }),
        sp({ id: 'b', seq: 8, division: '2', status: 'secured' }),
      ],
      typeLabel,
    );
    const div = r.rows[0]!;
    expect(div.groups.map((g) => g.key).sort()).toEqual(['a', 'b']);
    const a = div.groups.find((g) => g.key === 'a')!;
    expect(a.total).toBe(1);
    expect(a.label).toBe('#7 · NW corner · T-Shore');
  });

  it('passes legacy free-text divisions through divisionLabel unchanged', () => {
    const r = rollupByDivision([sp({ division: 'Roof', status: 'pending' })], typeLabel);
    expect(r.rows[0]!.label).toBe('Roof');
  });
});
