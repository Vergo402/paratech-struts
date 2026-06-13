import { describe, it, expect } from 'vitest';
import { NO_DEDUCTIONS, type ShorePoint, type FieldShoreEvent } from '../schema';
import { shorePointReducer, effectiveLengthInches, effectiveLengthFrom } from './reducer';
import { canTransition } from './status';

function sp(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp1',
    opId: 'op1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 40 * 8, // 40″
    deductions: NO_DEDUCTIONS,
    status: 'pending',
    ...over,
  };
}

const meta = { id: 'e1', opId: 'op1', at: 1, by: 'tester' };

describe('L-2 — effective length deducts once and floors to ⅛″', () => {
  it('subtracts the exact header-wood height once', () => {
    const point = sp({ deductions: { headerWood: '4x4', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' } });
    expect(effectiveLengthInches(point)).toBe(36.5); // 40 − 3.5
  });

  it('sums all four deduction slots at their exact catalog heights', () => {
    const point = sp({
      measurementEighths: 48 * 8,
      // header 4×4 (3.5) + footer 6×6 (5.5) + top plate threadedconn (3.5) + bottom plate swivel6 (1.8) = 14.3
      deductions: { headerWood: '4x4', footerWood: '6x6', topPlate: 'threadedconn', bottomPlate: 'swivel6' },
    });
    // 48 − 14.3 = 33.7 → floor to ⅛″ = 33.625
    expect(effectiveLengthInches(point)).toBe(33.625);
  });

  it('effectiveLengthFrom (the pre-SP ledger path) ≡ effectiveLengthInches', () => {
    const deductions = { headerWood: '4x4', footerWood: '6x6', topPlate: 'threadedconn', bottomPlate: 'swivel6' } as const;
    const point = sp({ measurementEighths: 48 * 8, deductions });
    expect(effectiveLengthFrom(48 * 8, deductions)).toBe(effectiveLengthInches(point));
    expect(effectiveLengthFrom(40 * 8, { headerWood: '4x4', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' })).toBe(36.5);
  });
});

describe('L-7 — single-SP status transitions', () => {
  it('canTransition is adjacency only (no skip, no same-status)', () => {
    expect(canTransition('process', 'strutset')).toBe(true);
    expect(canTransition('strutset', 'process')).toBe(true); // reversible (ADR-010)
    expect(canTransition('process', 'cutting')).toBe(false); // skip
    expect(canTransition('process', 'process')).toBe(false); // same
  });

  it('advances a valid adjacent transition', () => {
    const next = shorePointReducer(sp({ status: 'process' }), {
      type: 'ShorePointStatusChanged',
      ...meta,
      spId: 'sp1',
      from: 'process',
      to: 'strutset',
    } satisfies FieldShoreEvent);
    expect(next.status).toBe('strutset');
  });

  it('rejects a skip transition (leaves the point unchanged)', () => {
    const point = sp({ status: 'process' });
    const next = shorePointReducer(point, {
      type: 'ShorePointStatusChanged',
      ...meta,
      spId: 'sp1',
      from: 'process',
      to: 'cutting',
    } satisfies FieldShoreEvent);
    expect(next).toBe(point); // unchanged reference
  });

  it('rejects a stale transition whose `from` does not match current status', () => {
    const point = sp({ status: 'strutset' });
    const next = shorePointReducer(point, {
      type: 'ShorePointStatusChanged',
      ...meta,
      spId: 'sp1',
      from: 'process',
      to: 'cutting',
    } satisfies FieldShoreEvent);
    expect(next).toBe(point);
  });

  it('refuses the pending↔process boundary via a status change (deploy/return owns it)', () => {
    const point = sp({ status: 'pending' });
    const next = shorePointReducer(point, {
      type: 'ShorePointStatusChanged',
      ...meta,
      spId: 'sp1',
      from: 'pending',
      to: 'process',
    } satisfies FieldShoreEvent);
    expect(next).toBe(point);
  });
});

describe('deploy / return — the inventory-consequential boundary', () => {
  const deployed = { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv1' };

  it('deploy moves Pending → In Process and records the strut identity', () => {
    const next = shorePointReducer(sp({ status: 'pending' }), {
      type: 'StrutDeployed',
      ...meta,
      spId: 'sp1',
      deployedStrut: deployed,
    } satisfies FieldShoreEvent);
    expect(next.status).toBe('process');
    expect(next.deployedStrut).toEqual(deployed);
  });

  it('deploy is rejected if the point is not Pending', () => {
    const point = sp({ status: 'strutset' });
    const next = shorePointReducer(point, {
      type: 'StrutDeployed',
      ...meta,
      spId: 'sp1',
      deployedStrut: deployed,
    } satisfies FieldShoreEvent);
    expect(next).toBe(point);
  });

  it('return (step-back) moves In Process → Pending and clears the strut', () => {
    const point = sp({ status: 'process', deployedStrut: deployed });
    const next = shorePointReducer(point, { type: 'StrutReturned', ...meta, spId: 'sp1' } satisfies FieldShoreEvent);
    expect(next.status).toBe('pending');
    expect(next.deployedStrut).toBeUndefined();
  });
});

describe('#220 field-lock — editable fields by status', () => {
  it('allows editing shore type + measurement while Pending', () => {
    const next = shorePointReducer(sp({ status: 'pending' }), {
      type: 'ShorePointEdited',
      ...meta,
      spId: 'sp1',
      patch: { measurementEighths: 50 * 8, shoreType: '3-post', label: 'NW corner' },
    } satisfies FieldShoreEvent);
    expect(next.measurementEighths).toBe(50 * 8);
    expect(next.shoreType).toBe('3-post');
    expect(next.label).toBe('NW corner');
  });

  it('locks shore type + measurement once past Pending — only label changes', () => {
    const next = shorePointReducer(sp({ status: 'process', measurementEighths: 40 * 8 }), {
      type: 'ShorePointEdited',
      ...meta,
      spId: 'sp1',
      patch: { measurementEighths: 50 * 8, shoreType: '3-post', label: 'relabeled' },
    } satisfies FieldShoreEvent);
    expect(next.measurementEighths).toBe(40 * 8); // unchanged — locked
    expect(next.shoreType).toBe('t-shore'); // unchanged — locked
    expect(next.label).toBe('relabeled'); // label still editable
  });

  it('null clears building/area/label (the OperationEdited.location convention)', () => {
    const next = shorePointReducer(
      sp({ status: 'pending', building: 'B', area: 'NW corner', label: 'tagged' }),
      {
        type: 'ShorePointEdited',
        ...meta,
        spId: 'sp1',
        patch: { building: null, area: null, label: null },
      } satisfies FieldShoreEvent,
    );
    expect('building' in next).toBe(false);
    expect('area' in next).toBe(false);
    expect('label' in next).toBe(false);
  });

  it('label null-clear still works past Pending; locked optionals do not clear', () => {
    const next = shorePointReducer(sp({ status: 'cutting', area: 'NW corner', label: 'tagged' }), {
      type: 'ShorePointEdited',
      ...meta,
      spId: 'sp1',
      patch: { area: null, label: null },
    } satisfies FieldShoreEvent);
    expect(next.area).toBe('NW corner'); // locked — unchanged
    expect('label' in next).toBe(false); // label always editable
  });

  it('undefined (absent) keys leave fields untouched', () => {
    const next = shorePointReducer(sp({ status: 'pending', area: 'NW corner' }), {
      type: 'ShorePointEdited',
      ...meta,
      spId: 'sp1',
      patch: { label: 'only label' },
    } satisfies FieldShoreEvent);
    expect(next.area).toBe('NW corner');
  });

  it('crew assignment is reassignable past Pending (accountability, not locked)', () => {
    const next = shorePointReducer(sp({ status: 'cutting', assignedResource: 'Engine 1' }), {
      type: 'ShorePointEdited',
      ...meta,
      spId: 'sp1',
      patch: { assignedResource: 'Rescue 2' },
    } satisfies FieldShoreEvent);
    expect(next.assignedResource).toBe('Rescue 2'); // changed even past Pending
  });

  it('crew assignment null-clears (the null convention) even past Pending', () => {
    const next = shorePointReducer(sp({ status: 'secured', assignedResource: 'Engine 1' }), {
      type: 'ShorePointEdited',
      ...meta,
      spId: 'sp1',
      patch: { assignedResource: null },
    } satisfies FieldShoreEvent);
    expect('assignedResource' in next).toBe(false);
  });

  it('estimated load locks past Pending (it drives strut selection, like measurement)', () => {
    const next = shorePointReducer(sp({ status: 'process', estimatedLoad: 10000 }), {
      type: 'ShorePointEdited',
      ...meta,
      spId: 'sp1',
      patch: { estimatedLoad: 25000 },
    } satisfies FieldShoreEvent);
    expect(next.estimatedLoad).toBe(10000); // unchanged — locked
  });
});
