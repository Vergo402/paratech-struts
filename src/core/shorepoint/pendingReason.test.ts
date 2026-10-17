import { describe, it, expect } from 'vitest';
import { NO_DEDUCTIONS, type StockRow, type ShorePoint } from '../schema';
import { pendingReasonFor, pendingNeedModels } from './pendingReason';

function sp(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp1',
    opId: 'op1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 30 * 8, // 30″
    deductions: NO_DEDUCTIONS,
    status: 'pending',
    ...over,
  };
}

const strut = (id: string, model: string, system: StockRow['system'], available: number): StockRow => ({
  id,
  type: 'strut',
  model,
  system,
  apparatus: 'Rescue 2',
  apparatusId: 'app-rescue-2',
  quantity: Math.max(available, 1),
  held: Math.max(available, 1) - available,
  available,
});

describe('pendingReasonFor — live reason for a Pending point (#221)', () => {
  it('undefined when stocked recommendations exist', () => {
    const inv = [strut('inv-ls203', 'LS 203', 'LongShore', 4)];
    expect(pendingReasonFor(sp(), inv)).toBeUndefined();
  });

  it('undefined when the only result is unrated (deployable with acknowledgment)', () => {
    // 200″ on an LS 1016 + 48″ extension: physically reaches, beyond the chart.
    const inv = [
      strut('inv-ls1016', 'LS 1016', 'LongShore', 2),
      {
        id: 'inv-ext48',
        type: 'extension',
        system: 'LongShore',
        length: 48,
        apparatus: 'Engine 1',
        apparatusId: 'app-engine-1',
        quantity: 1,
        held: 0,
        available: 1,
      } as StockRow,
    ];
    expect(pendingReasonFor(sp({ measurementEighths: 200 * 8 }), inv)).toBeUndefined();
  });

  it('no-inventory when the fitting model exists in the catalog but stock is zero-available', () => {
    const inv = [strut('inv-ls203', 'LS 203', 'LongShore', 0)];
    expect(pendingReasonFor(sp(), inv)).toBe('no-inventory');
  });

  it('no-inventory when the inventory table is empty (catalog still reaches)', () => {
    expect(pendingReasonFor(sp(), [])).toBe('no-inventory');
  });

  it('no-match when nothing fits geometrically, even unrestricted', () => {
    // 16″ falls in the catalog gap: AT 12-15 tops out at 15″, AT 19-25 cannot
    // collapse below 19″ — the seed's pinned no-match measurement (#247).
    const inv = [strut('inv-ls203', 'LS 203', 'LongShore', 4)];
    expect(pendingReasonFor(sp({ measurementEighths: 16 * 8 }), inv)).toBe('no-match');
  });

  it('no-match wins over no-inventory when geometry is the blocker', () => {
    expect(pendingReasonFor(sp({ measurementEighths: 16 * 8 }), [])).toBe('no-match');
  });

  // #531 — a heavy load never changes the reason: it just needs more struts of a model that
  // fits. There is no load-driven pending reason any more.
  it('a 5+ strut load does not change the reason — stocked fit is still deployable (undefined)', () => {
    // 132″ reaches on an LS 1016; 60,000 lb needs more than 4 struts, which is an ordinary result.
    const inv = [strut('inv-ls1016', 'LS 1016', 'LongShore', 4)];
    expect(pendingReasonFor(sp({ measurementEighths: 132 * 8, estimatedLoad: 60000 }), inv)).toBeUndefined();
    expect(pendingReasonFor(sp({ estimatedLoad: 500_000 }), [strut('inv-ls203', 'LS 203', 'LongShore', 1)])).toBeUndefined();
  });

  it('a 5+ strut load with no stock is no-inventory (the catalog still fits), never a load reason', () => {
    expect(pendingReasonFor(sp({ measurementEighths: 132 * 8, estimatedLoad: 60000 }), [])).toBe('no-inventory');
  });

  it('a 5+ strut load does not turn a geometry miss into anything else (still no-match)', () => {
    expect(pendingReasonFor(sp({ measurementEighths: 16 * 8, estimatedLoad: 500_000 }), [])).toBe('no-match');
  });
});

describe('pendingNeedModels — what equipment a no-inventory wait needs (issue 1)', () => {
  it('names the catalog strut(s) that fit the opening, deduped', () => {
    const models = pendingNeedModels(sp({ measurementEighths: 30 * 8 }));
    expect(models.length).toBeGreaterThan(0);
    expect(new Set(models).size).toBe(models.length); // no duplicate models
    expect(models.every((m) => typeof m === 'string' && m.length > 0)).toBe(true);
  });

  it('a 5+ strut load still names the models that fit (the load never removes a fit)', () => {
    const light = pendingNeedModels(sp({ measurementEighths: 30 * 8 }));
    expect(pendingNeedModels(sp({ measurementEighths: 30 * 8, estimatedLoad: 500_000 })).sort()).toEqual([...light].sort());
  });

  it('empty when nothing in the catalog fits (a no-match point)', () => {
    // 1000″ — far beyond any strut + extension in the catalog.
    expect(pendingNeedModels(sp({ measurementEighths: 1000 * 8 }))).toEqual([]);
  });
});
