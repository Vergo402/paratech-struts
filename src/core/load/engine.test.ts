import { describe, it, expect } from 'vitest';
import { getLoadCapacity, findStrutCombinations } from './engine';

// L-1 — conservative floor. Between two table rows the capacity is the LONGER
// (lower-capacity) row, never an interpolation. The two assertions on 130″ and
// 150″ are the exact historical bug points: linear interpolation over-reported
// capacity there by +17% / +17.9% before v3.5.2.
describe('L-1 getLoadCapacity — conservative floor, never interpolate upward', () => {
  it('returns the exact value at a data point', () => {
    expect(getLoadCapacity('AcmeThread', 120, 2)).toBe(5360);
    expect(getLoadCapacity('AcmeThread', 132, 2)).toBe(3932);
    expect(getLoadCapacity('LongShore', 144, 2)).toBe(10000);
    expect(getLoadCapacity('LongShore', 156, 2)).toBe(7000);
  });

  it('ACME 130″ (between 120″ and 132″) floors to the 132″ row — not interpolated', () => {
    // interpolation would have read ~4595; the manual value at the longer row is 3932.
    expect(getLoadCapacity('AcmeThread', 130, 2)).toBe(3932);
  });

  it('LongShore 150″ (between 144″ and 156″) floors to the 156″ row — not interpolated', () => {
    // interpolation would have read ~8250; the manual value at the longer row is 7000.
    expect(getLoadCapacity('LongShore', 150, 2)).toBe(7000);
  });

  it('clamps below the first row to the first-row value', () => {
    expect(getLoadCapacity('LongShore', 40, 2)).toBe(22000); // 72″ row value
  });

  it('returns 0 strictly beyond the last row (out of rated range)', () => {
    expect(getLoadCapacity('LongShore', 200, 2)).toBe(0);
    expect(getLoadCapacity('AcmeThread', 145, 2)).toBe(0);
  });

  it('capacity is monotonically non-increasing with length across the rated range', () => {
    let prev = Infinity;
    for (let len = 72; len <= 192; len++) {
      const cap = getLoadCapacity('LongShore', len, 2);
      expect(cap).toBeLessThanOrEqual(prev);
      prev = cap;
    }
  });
});

describe('findStrutCombinations — selection, deductions, warnings', () => {
  it('finds a strut-only fit for a 30″ opening (no deductions)', () => {
    const res = findStrutCombinations(30, 0, 2);
    expect(res.length).toBeGreaterThan(0);
    // LS 203 (26–36) reaches 30″ with no extension
    expect(res.some((r) => r.strut.model === 'LS 203' && r.extensions.length === 0)).toBe(true);
  });

  it('L-2 — deducts exactly once and floors the effective length to ⅛″', () => {
    // opening 40″, header wood 4×4 = 3.5″ → effective 36.5″
    const res = findStrutCombinations(40, 0, 2, null, null, { header: 3.5 });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0]!.openingLength).toBe(40);
    expect(res[0]!.effectiveLength).toBe(36.5);
  });

  it('L-2 — rounds the effective length DOWN to the nearest ⅛″, never up', () => {
    // 40 − 0.1 = 39.9 → floor to ⅛″ = 39.875 (not 39.9, not 40)
    const res = findStrutCombinations(40, 0, 2, null, null, { header: 0.1 });
    expect(res[0]!.effectiveLength).toBe(39.875);
  });

  it('capacity is looked up at the EXACT length, not the ⅛″-floored one (row-cliff over-report, 2026-07-02 audit)', () => {
    // AcmeThread opening 63.5″ − a 3.4″ top plate = 60.1″ TRUE effective length.
    // The displayed/selection length floors to 60.0″, but capacity must NOT: the
    // 60″ row is higher-capacity than the 72″ row, so looking up at the floored
    // 60.0″ would over-report. 60.1″ is strictly between → conservative 72″ row.
    const res = findStrutCombinations(63.5, 0, 2, null, null, { topPlate: 3.4 });
    const combo = res.find((r) => r.strut.system === 'AcmeThread' && r.extensions.length === 0);
    expect(combo).toBeDefined();
    // Display still floors to ⅛″ (60.0″), the selection/display domain is unchanged.
    expect(combo!.effectiveLength).toBe(60);
    // But capacity is the conservative 72″-row value (exact 60.1″ is between rows),
    // NOT the inflated 60″-row value.
    expect(combo!.capacity).toBe(getLoadCapacity('AcmeThread', 60.1, 2));
    expect(combo!.capacity).toBe(getLoadCapacity('AcmeThread', 72, 2));
    expect(combo!.capacity).not.toBe(getLoadCapacity('AcmeThread', 60, 2));
    expect(getLoadCapacity('AcmeThread', 60, 2)).toBeGreaterThan(combo!.capacity); // the over-report that was
  });

  it('a length landing exactly on a whole-inch row still reads that row (no deduction cliff)', () => {
    // 60″ opening, no deduction → exact 60.0″ → the 60″ row exactly (not floored past it).
    const res = findStrutCombinations(60, 0, 2, null, null, null);
    const combo = res.find((r) => r.strut.system === 'AcmeThread' && r.extensions.length === 0);
    if (combo) expect(combo.capacity).toBe(getLoadCapacity('AcmeThread', 60, 2));
  });

  it('surfaces a deployable unrated-zone warning for LongShore beyond 192″', () => {
    const res = findStrutCombinations(200, 0, 2, null, null, null);
    expect(res.some((r) => r.unrated === true)).toBe(true);
    // warnings sort to the top
    expect(res[0]!.unrated).toBe(true);
  });

  it('returns no combinations for a measurement nothing can reach', () => {
    const res = findStrutCombinations(400, 0, 2, null, null, null);
    expect(res).toEqual([]);
  });

  it('accepts two same-size extensions split across separate inventory rows (audit W8)', () => {
    const SF = 2;
    const len = 45;
    // A catalog combo at this length that needs two identical extensions (only
    // AcmeThread/LockStroke carry two; same size ⇒ a qty-2 need of one length).
    const doubled = findStrutCombinations(len, 0, SF, null).find(
      (c) => c.extensions.length === 2 && c.extensions[0] === c.extensions[1],
    );
    expect(doubled).toBeDefined();
    const size = doubled!.extensions[0]!;
    const { model, system } = doubled!.strut;
    const strutRow = { id: 's', type: 'strut', model, system, apparatus: 'R2', apparatusId: 'a', quantity: 1, available: 1 };
    const extRow = (id: string) => ({ id, type: 'extension', system, length: size, apparatus: 'R2', apparatusId: 'a', quantity: 1, available: 1 });

    // Two rows of one each → the qty-2 need is met (the fix).
    const split = findStrutCombinations(len, 0, SF, [strutRow, extRow('e1'), extRow('e2')] as never);
    expect(split.some((c) => c.strut.model === model && c.extensions.length === 2)).toBe(true);

    // A single row of one is still correctly short.
    const single = findStrutCombinations(len, 0, SF, [strutRow, extRow('e1')] as never);
    expect(
      single.some((c) => c.strut.model === model && c.extensions.length === 2 && c.extensions[0] === size),
    ).toBe(false);
  });
});

// ADR-033 Phase 0 — the engine surfaces the stock record it would source for each
// extension instance, so the deploy path can commit the BOM without re-deriving the
// pooling. Strictly additive: the selection math and every assertion above are untouched.
describe('ADR-033 Phase 0 — extension inventory ids on the result', () => {
  it('catalog mode (no inventory) → extension combos carry no extensionSources', () => {
    const res = findStrutCombinations(45, 0, 2, null);
    expect(res.some((c) => c.extensions.length > 0)).toBe(true); // extensions are in play at 45″
    expect(res.every((c) => c.extensionSources === undefined)).toBe(true);
  });

  it('strut-only combos carry no extensionSources even when inventory is passed', () => {
    const c0 = findStrutCombinations(30, 0, 2, null).find((c) => c.extensions.length === 0);
    expect(c0).toBeDefined();
    const { model, system } = c0!.strut;
    const strutRow = { id: 's', type: 'strut', model, system, apparatus: 'R2', apparatusId: 'a', quantity: 1, available: 1 };
    const res = findStrutCombinations(30, 0, 2, [strutRow] as never);
    const combo = res.find((c) => c.strut.model === model && c.extensions.length === 0);
    expect(combo).toBeDefined();
    expect(combo!.extensionSources).toBeUndefined();
  });

  it('surfaces one source per extension instance, splitting a qty-2 need across two rows (W8)', () => {
    const SF = 2;
    const len = 45;
    const doubled = findStrutCombinations(len, 0, SF, null).find(
      (c) => c.extensions.length === 2 && c.extensions[0] === c.extensions[1],
    );
    expect(doubled).toBeDefined();
    const size = doubled!.extensions[0]!;
    const { model, system } = doubled!.strut;
    const strutRow = { id: 's', type: 'strut', model, system, apparatus: 'R2', apparatusId: 'a', quantity: 1, available: 1 };
    const extRow = (id: string) => ({ id, type: 'extension', system, length: size, apparatus: 'R2', apparatusId: 'a', quantity: 1, available: 1 });

    const res = findStrutCombinations(len, 0, SF, [strutRow, extRow('e1'), extRow('e2')] as never);
    const combo = res.find((c) => c.strut.model === model && c.extensions.length === 2);
    expect(combo).toBeDefined();
    expect(combo!.extensionSources).toHaveLength(2);
    expect(combo!.extensionSources!.every((s) => s.length === size)).toBe(true);
    // the two instances resolve to the two DISTINCT rows, not the same row twice
    const ids = combo!.extensionSources!.map((s) => s.inventoryId).sort();
    expect(ids).toEqual(['e1', 'e2']);
  });
});
