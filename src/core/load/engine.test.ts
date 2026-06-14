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
