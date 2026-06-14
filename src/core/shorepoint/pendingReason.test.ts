import { describe, it, expect } from 'vitest';
import { NO_DEDUCTIONS, type InventoryItem, type ShorePoint } from '../schema';
import { pendingReasonFor } from './pendingReason';

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

const strut = (id: string, model: string, system: InventoryItem['system'], available: number): InventoryItem => ({
  id,
  type: 'strut',
  model,
  system,
  apparatus: 'Rescue 2',
  apparatusId: 'app-rescue-2',
  quantity: Math.max(available, 1),
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
        available: 1,
      } as InventoryItem,
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

  it('over-capacity when the opening fits but the estimated load exceeds the 4-strut cap', () => {
    // 132″ reaches on an LS 1016, but 60,000 lb needs > 4 struts → every combo
    // comes back as an exceedsCapacity sentinel: a load problem, not a geometry miss.
    const inv = [strut('inv-ls1016', 'LS 1016', 'LongShore', 4)];
    expect(pendingReasonFor(sp({ measurementEighths: 132 * 8, estimatedLoad: 60000 }), inv)).toBe('over-capacity');
  });
});
