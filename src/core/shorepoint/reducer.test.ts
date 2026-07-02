import { describe, it, expect } from 'vitest';
import { NO_DEDUCTIONS, type ShorePoint, type FieldShoreEvent, type DeployedBom } from '../schema';
import {
  shorePointReducer,
  effectiveLengthInches,
  effectiveLengthFrom,
  deductionTotalInches,
  cutLengthInches,
  deployedCapacityFlag,
} from './reducer';
import { deployedStrutOf } from './bom';
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

  it('deductionTotalInches sums the four slots EXACTLY (no rounding — #248 card detail)', () => {
    expect(deductionTotalInches(NO_DEDUCTIONS)).toBe(0);
    expect(
      deductionTotalInches({ headerWood: '4x4', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' }),
    ).toBe(3.5);
    // header 4×4 (3.5) + footer 6×6 (5.5) + top threadedconn (3.5) + bottom swivel6 (1.8) = 14.3 exact.
    expect(
      deductionTotalInches({ headerWood: '4x4', footerWood: '6x6', topPlate: 'threadedconn', bottomPlate: 'swivel6' }),
    ).toBeCloseTo(14.3, 10);
  });
});

describe('cutLengthInches — wood cut length, shore-type-fixed lumber + wedge (#361)', () => {
  it('T-Shore & Double-T cut to 4×4 header+footer − 1.5″ wedge', () => {
    // 40 − 2×3.5 − 1.5 = 31.5
    expect(cutLengthInches(sp({ shoreType: 't-shore' }))).toBe(31.5);
    expect(cutLengthInches(sp({ shoreType: 'double-t' }))).toBe(31.5);
  });

  it('3-Post cuts to 6×6 header+footer − 1.5″ wedge', () => {
    // 40 − 2×5.5 − 1.5 = 27.5
    expect(cutLengthInches(sp({ shoreType: '3-post' }))).toBe(27.5);
  });

  it('uses the SHORE-TYPE lumber, NOT the operator strut deduction (the v3 correction)', () => {
    // A T-Shore sized with a 6×6 strut deduction still CUTS to 4×4 (31.5), not 6×6.
    const point = sp({
      shoreType: 't-shore',
      deductions: { headerWood: '6x6', footerWood: '6x6', topPlate: 'threadedconn', bottomPlate: 'swivel6' },
    });
    expect(cutLengthInches(point)).toBe(31.5);
    // …and that is NOT the strut effective length, which DOES use the operator deduction.
    expect(effectiveLengthInches(point)).not.toBe(31.5);
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
  // ADR-033 — the strut member a legacy deploy projects to.
  const deployedComponent = { role: 'strut' as const, ...deployed };

  // --- LEGACY-projection coverage (StrutDeployed / StrutReturned, replay only) ---
  it('LEGACY deploy moves Pending Equipment → Equipment Assigned and projects the strut into a one-element BOM', () => {
    const next = shorePointReducer(sp({ status: 'pending' }), {
      type: 'StrutDeployed',
      ...meta,
      spId: 'sp1',
      deployedStrut: deployed,
    } satisfies FieldShoreEvent);
    expect(next.status).toBe('process');
    expect(deployedStrutOf(next)).toEqual(deployedComponent);
  });

  it('LEGACY deploy is rejected if the point is not Pending Equipment', () => {
    const point = sp({ status: 'strutset' });
    const next = shorePointReducer(point, {
      type: 'StrutDeployed',
      ...meta,
      spId: 'sp1',
      deployedStrut: deployed,
    } satisfies FieldShoreEvent);
    expect(next).toBe(point);
  });

  it('LEGACY return (step-back) moves Equipment Assigned → Pending Equipment and clears the BOM', () => {
    const point = sp({ status: 'process', deployedBom: [deployedComponent] });
    const next = shorePointReducer(point, { type: 'StrutReturned', ...meta, spId: 'sp1' } satisfies FieldShoreEvent);
    expect(next.status).toBe('pending');
    expect(next.deployedBom).toBeUndefined();
  });

  // --- ADR-033 BOM events ---
  const bom: DeployedBom = [
    { role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv1' },
    { role: 'top-plate', plateId: 'threadedconn', source: 'Rescue 2', inventoryId: 'inv2' },
    { role: 'extension', length: 18, source: 'Engine 1', inventoryId: 'inv3' },
  ];

  it('EquipmentDeployed moves Pending Equipment → Equipment Assigned and records the full BOM', () => {
    const next = shorePointReducer(sp({ status: 'pending' }), {
      type: 'EquipmentDeployed',
      ...meta,
      spId: 'sp1',
      deployedBom: bom,
    } satisfies FieldShoreEvent);
    expect(next.status).toBe('process');
    expect(next.deployedBom).toEqual(bom);
  });

  it('EquipmentDeployed is rejected if the point is not Pending Equipment', () => {
    const point = sp({ status: 'strutset' });
    const next = shorePointReducer(point, {
      type: 'EquipmentDeployed',
      ...meta,
      spId: 'sp1',
      deployedBom: bom,
    } satisfies FieldShoreEvent);
    expect(next).toBe(point);
  });

  it('EquipmentReturned moves Equipment Assigned → Pending Equipment and clears the BOM', () => {
    const point = sp({ status: 'process', deployedBom: bom });
    const next = shorePointReducer(point, { type: 'EquipmentReturned', ...meta, spId: 'sp1' } satisfies FieldShoreEvent);
    expect(next.status).toBe('pending');
    expect(next.deployedBom).toBeUndefined();
  });

  it('EquipmentReclaimed (#224) moves Wood Shore Secured → Returned and KEEPS the BOM as history', () => {
    const point = sp({ status: 'secured', deployedBom: bom });
    const next = shorePointReducer(point, { type: 'EquipmentReclaimed', ...meta, spId: 'sp1' } satisfies FieldShoreEvent);
    expect(next.status).toBe('returned');
    expect(next.deployedBom).toEqual(bom); // retained, NOT cleared
  });

  it('EquipmentReclaimed is rejected if the point is not Wood Shore Secured', () => {
    const point = sp({ status: 'runner', deployedBom: bom });
    const next = shorePointReducer(point, { type: 'EquipmentReclaimed', ...meta, spId: 'sp1' } satisfies FieldShoreEvent);
    expect(next).toBe(point);
  });

  it('EquipmentReclaimed ignores an event for another shore point', () => {
    const point = sp({ status: 'secured', deployedBom: bom });
    const next = shorePointReducer(point, { type: 'EquipmentReclaimed', ...meta, spId: 'other' } satisfies FieldShoreEvent);
    expect(next).toBe(point);
  });

  it('ComponentResourced re-points one component to a new rig (source + inventoryId) without changing status', () => {
    const point = sp({ status: 'process', deployedBom: bom });
    const next = shorePointReducer(point, {
      type: 'ComponentResourced',
      ...meta,
      spId: 'sp1',
      componentIndex: 1,
      source: 'Ladder 3',
      inventoryId: 'inv9',
    } satisfies FieldShoreEvent);
    expect(next.status).toBe('process'); // unchanged
    expect(next.deployedBom?.[1]).toEqual({ role: 'top-plate', plateId: 'threadedconn', source: 'Ladder 3', inventoryId: 'inv9' });
    expect(next.deployedBom?.[0]).toEqual(bom[0]); // other slots untouched
    expect(next.deployedBom?.[2]).toEqual(bom[2]);
  });

  it('ComponentResourced dropping inventoryId makes the component untracked', () => {
    const point = sp({ status: 'process', deployedBom: bom });
    const next = shorePointReducer(point, {
      type: 'ComponentResourced',
      ...meta,
      spId: 'sp1',
      componentIndex: 1,
      source: 'untracked',
    } satisfies FieldShoreEvent);
    expect(next.status).toBe('process'); // unchanged
    expect(next.deployedBom?.[1]).toEqual({ role: 'top-plate', plateId: 'threadedconn', source: 'untracked' });
    expect('inventoryId' in (next.deployedBom?.[1] ?? {})).toBe(false);
  });

  it('ComponentResourced is a no-op for another shore point', () => {
    const point = sp({ status: 'process', deployedBom: bom });
    const next = shorePointReducer(point, {
      type: 'ComponentResourced',
      ...meta,
      spId: 'other',
      componentIndex: 1,
      source: 'Ladder 3',
      inventoryId: 'inv9',
    } satisfies FieldShoreEvent);
    expect(next).toBe(point);
  });

  it('ComponentResourced is a no-op when the point has no deployed BOM (illegal state)', () => {
    const point = sp({ status: 'pending' });
    const next = shorePointReducer(point, {
      type: 'ComponentResourced',
      ...meta,
      spId: 'sp1',
      componentIndex: 0,
      source: 'Ladder 3',
      inventoryId: 'inv9',
    } satisfies FieldShoreEvent);
    expect(next).toBe(point);
  });
});

describe('#220 field-lock — editable fields by status', () => {
  it('allows editing shore type + measurement while Pending Equipment', () => {
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

  it('locks shore type + measurement once past Pending Equipment — only label changes', () => {
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

  it('label null-clear still works past Pending Equipment; locked optionals do not clear', () => {
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

  it('crew assignment is reassignable past Pending Equipment (accountability, not locked)', () => {
    const next = shorePointReducer(sp({ status: 'cutting', assignedResource: 'Engine 1' }), {
      type: 'ShorePointEdited',
      ...meta,
      spId: 'sp1',
      patch: { assignedResource: 'Rescue 2' },
    } satisfies FieldShoreEvent);
    expect(next.assignedResource).toBe('Rescue 2'); // changed even past Pending Equipment
  });

  it('crew assignment null-clears (the null convention) even past Pending Equipment', () => {
    const next = shorePointReducer(sp({ status: 'secured', assignedResource: 'Engine 1' }), {
      type: 'ShorePointEdited',
      ...meta,
      spId: 'sp1',
      patch: { assignedResource: null },
    } satisfies FieldShoreEvent);
    expect('assignedResource' in next).toBe(false);
  });

  it('estimated load locks past Pending Equipment (it drives strut selection, like measurement)', () => {
    const next = shorePointReducer(sp({ status: 'process', estimatedLoad: 10000 }), {
      type: 'ShorePointEdited',
      ...meta,
      spId: 'sp1',
      patch: { estimatedLoad: 25000 },
    } satisfies FieldShoreEvent);
    expect(next.estimatedLoad).toBe(10000); // unchanged — locked
  });
});

describe('deployedCapacityFlag — persistent board-card safety flag (#410 audit #7)', () => {
  const strutBom = (model: string): DeployedBom => [{ role: 'strut', model, system: 'LongShore', source: 'Eng 1', inventoryId: 'i1' }];

  it('flags over-capacity when a single strut’s load share exceeds its rating', () => {
    // 58.5″ + 34,000 lb on ONE LS 406 (rated 22,000 @4:1) → over capacity.
    const point = sp({ measurementEighths: 468, estimatedLoad: 34000, deployedBom: strutBom('LS 406') });
    expect(deployedCapacityFlag(point)).toBe('over-capacity');
  });

  it('flags unrated for a LongShore shore beyond the published 192″ chart', () => {
    // 195″ — LS 1016 (114–198) reaches it with no extension; past the chart → unrated.
    const point = sp({ measurementEighths: 195 * 8, deployedBom: strutBom('LS 1016') });
    expect(deployedCapacityFlag(point)).toBe('unrated');
  });

  it('no flag for a clean deploy within rating', () => {
    const point = sp({ measurementEighths: 468, estimatedLoad: 5000, deployedBom: strutBom('LS 406') });
    expect(deployedCapacityFlag(point)).toBeNull();
  });

  it('no flag when a linked group shares the load within rating (Double-T member)', () => {
    // 34,000 / 2 = 17,000 per strut ≤ 22,000 rating.
    const point = sp({ measurementEighths: 468, estimatedLoad: 34000, groupTotal: 2, deployedBom: strutBom('LS 406') });
    expect(deployedCapacityFlag(point)).toBeNull();
  });

  it('no over-capacity flag when NO load was recorded (absence of data is never a flag)', () => {
    const point = sp({ measurementEighths: 468, deployedBom: strutBom('LS 406') });
    expect(deployedCapacityFlag(point)).toBeNull();
  });

  it('no flag for a pending shore with no strut on record', () => {
    expect(deployedCapacityFlag(sp())).toBeNull();
  });
});
