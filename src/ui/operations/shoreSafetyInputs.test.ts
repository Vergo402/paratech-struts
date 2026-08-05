import { describe, expect, it } from 'vitest';
import type { ShorePoint } from '@core/schema';
import { shoreSafety } from './shoreSafety';

/**
 * shoreSafety — DEGENERATE INPUTS that must never read as a pass (#455, #457).
 *
 * REAL ENGINE ONLY. `findForShorePoint` is deliberately NOT mocked (the companion
 * `shoreSafety.test.ts` mocks it to pin branching; a stub cannot prove the verdict a
 * real fit produces). Every verdict below comes from the actual fit engine + load
 * tables — which is the whole point: each case here is one where the engine happily
 * returns a clean match and the WRONG answer would be "Within rated capacity".
 *
 * Fixture: a T-Shore at 58.5″ on an LS 406 — rated 22,000 lb @4:1 (the figure
 * capacityFlagSurfaces.test.tsx and core/shorepoint/reducer.test.ts independently pin).
 * The control case proves the fixture really does reach the `ok` branch, so each
 * failing assertion below is caused by the input under test and nothing else.
 */

function makeSp(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp-1',
    opId: 'op-1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 468, // 58.5″
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status: 'secured',
    deployedBom: [{ role: 'strut', model: 'LS 406', system: 'LongShore', source: 'Eng 1', inventoryId: 'i1' }],
    ...over,
  };
}

describe('shoreSafety — the fixture reaches a real pass (control)', () => {
  it('a well-formed point under rating reads ok', () => {
    const v = shoreSafety(makeSp({ estimatedLoad: 5_000 }));
    expect(v.kind).toBe('ok');
    expect(v.msg).toMatch(/Within rated capacity/);
  });
});

describe('shoreSafety — a 0 load is not a load estimate (#455)', () => {
  it('estimatedLoad 0 reads unknown, not "within rated capacity"', () => {
    const v = shoreSafety(makeSp({ estimatedLoad: 0 }));
    expect(v.kind).toBe('unknown');
    expect(v.msg).toMatch(/No load estimate recorded/);
    expect(v.msg).not.toMatch(/Within rated capacity/);
  });

  it('a negative load (schema-legal via a peer write) reads unknown too', () => {
    expect(shoreSafety(makeSp({ estimatedLoad: -1 })).kind).toBe('unknown');
  });

  it('an absent load still reads unknown (unchanged behavior)', () => {
    expect(shoreSafety(makeSp()).kind).toBe('unknown');
  });

  it('0 does not become a false WARN either — it is unverified, not over capacity', () => {
    // The 3-Post denominator path: a 0 load must not divide into a fake exceedance.
    const v = shoreSafety(makeSp({ estimatedLoad: 0, groupTotal: 3 }), 1);
    expect(v.kind).toBe('unknown');
  });
});

describe('shoreSafety — a connector outside this build\'s catalog (#457)', () => {
  it('an unknown plate id reads unknown — its 0″ deduction is not a verified length', () => {
    const v = shoreSafety(
      makeSp({
        estimatedLoad: 5_000,
        deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'plate-from-a-newer-build', bottomPlate: 'none' },
      }),
    );
    expect(v.kind).toBe('unknown');
    expect(v.msg).toMatch(/not in this app’s catalog/);
  });

  it('the bottom slot is checked too', () => {
    const v = shoreSafety(
      makeSp({
        estimatedLoad: 5_000,
        deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'zzz' },
      }),
    );
    expect(v.kind).toBe('unknown');
  });

  it('a REAL catalog plate is unaffected (the check is not a blanket downgrade)', () => {
    const v = shoreSafety(
      makeSp({
        estimatedLoad: 5_000,
        deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'swivel6', bottomPlate: 'rigid6' },
      }),
    );
    expect(v.kind).toBe('ok');
  });
});
