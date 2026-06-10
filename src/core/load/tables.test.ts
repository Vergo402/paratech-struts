import { describe, it, expect } from 'vitest';
import { ACME_LOAD_TABLE, LONGSHORE_LOAD_TABLE } from './tables';

// L-1 — the load tables are PDF-sourced safety data. This snapshot pins every
// value against the manual; any drift fails CI. The numbers below are the
// canonical Paratech figures (O&M Manual Table 2-7 + LongShore datasheet),
// independently transcribed here so a typo in tables.ts cannot also pass review.
const ACME_EXPECTED = [
  [24, 40000, 26666, 20000],
  [36, 40000, 26666, 20000],
  [48, 40000, 26666, 20000],
  [60, 33102, 22068, 16551],
  [72, 28250, 18833, 14125],
  [84, 26162, 17441, 13081],
  [96, 24050, 16033, 12025],
  [108, 18276, 12184, 9138],
  [120, 10720, 7146, 5360],
  [132, 7864, 5242, 3932],
  [144, 7660, 5106, 3830],
];

const LONGSHORE_EXPECTED = [
  [72, 44000, 29333, 22000],
  [84, 44000, 29333, 22000],
  [96, 40000, 26666, 20000],
  [108, 32000, 21333, 16000],
  [120, 24000, 16000, 12000],
  [132, 22000, 14667, 11000],
  [144, 20000, 13333, 10000],
  [156, 14000, 9332, 7000],
  [168, 12000, 8000, 6000],
  [180, 9000, 6000, 4500],
  [192, 6000, 4000, 3000],
];

describe('L-1 load tables — frozen & PDF-sourced', () => {
  it('ACME/AcmeThread table matches the O&M manual exactly', () => {
    expect(ACME_LOAD_TABLE).toEqual(ACME_EXPECTED);
  });

  it('LongShore table matches the datasheet exactly', () => {
    expect(LONGSHORE_LOAD_TABLE).toEqual(LONGSHORE_EXPECTED);
  });

  it('tables are frozen (cannot be mutated at runtime)', () => {
    expect(Object.isFrozen(ACME_LOAD_TABLE)).toBe(true);
    expect(Object.isFrozen(LONGSHORE_LOAD_TABLE)).toBe(true);
  });

  it('tables are non-empty 4-tuples (the engine indexes assume this)', () => {
    for (const table of [ACME_LOAD_TABLE, LONGSHORE_LOAD_TABLE]) {
      expect(table.length).toBeGreaterThan(0);
      for (const row of table) expect(row).toHaveLength(4);
    }
  });

  it('lengths are strictly ascending (the floor lookup assumes order)', () => {
    for (const table of [ACME_LOAD_TABLE, LONGSHORE_LOAD_TABLE]) {
      for (let i = 1; i < table.length; i++) {
        expect(table[i]![0]).toBeGreaterThan(table[i - 1]![0]);
      }
    }
  });
});
