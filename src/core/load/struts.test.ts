import { describe, expect, it } from 'vitest';
import { STRUTS, strutSysKey, sysKeyOf } from './struts';

describe('strut system key (rec card + shore-point number tab)', () => {
  it('keys off the SYSTEM for LockStroke (grey-colored, cyan identity), else the color', () => {
    expect(sysKeyOf('LongShore', 'gold')).toBe('gold');
    expect(sysKeyOf('AcmeThread', 'grey')).toBe('grey');
    expect(sysKeyOf('LockStroke', 'grey')).toBe('lockstroke'); // physically grey, cyan identity
  });

  it('resolves a deployed strut model to its system key', () => {
    expect(strutSysKey('LS 203')).toBe('gold'); // LongShore
    expect(strutSysKey('AT 19-25')).toBe('grey'); // AcmeThread
    expect(strutSysKey('LK 19-25')).toBe('lockstroke'); // LockStroke
  });

  it('returns null for an unknown model (tab falls back to the ghost state)', () => {
    expect(strutSysKey('NOT A REAL STRUT')).toBeNull();
  });
});

describe('LongShore (gold) catalog matches the Paratech brochure', () => {
  it('lists all five published models with their collapsed–extended ranges', () => {
    const gold = STRUTS.filter((s) => s.system === 'LongShore').map((s) => `${s.model} ${s.collapsed}-${s.extended}`);
    expect(gold).toEqual([
      'LS 203 26-36',
      'LS 304 36-50',
      'LS 406 48-73',
      'LS 610 72-116',
      'LS 1016 114-198',
    ]);
  });

  // Guard, not a formality: LS 812 was carried by v4 until 2026-07-28 on the strength
  // of an older brochure part number (22-796370). Paratech's live site + Product
  // Catalog v.19 list exactly five LongShore sizes, so v4 now matches v3.22.3. This
  // assertion exists so a future reader re-finding the brochure fails the suite
  // instead of silently restoring a strut no rig stocks. See struts.ts header.
  it('excludes LS 812 — removed 2026-07-28 to match v3.22.3 (catalog v.19 + live site)', () => {
    expect(STRUTS.some((s) => s.model === 'LS 812')).toBe(false);
    expect(STRUTS.some((s) => s.id === 'ls-812')).toBe(false);
  });
});

describe('AcmeThread (grey) catalog matches the Paratech brochure', () => {
  it('lists the five published sizes with their ranges', () => {
    const at = STRUTS.filter((s) => s.system === 'AcmeThread').map((s) => `${s.model} ${s.collapsed}-${s.extended}`);
    expect(at).toEqual([
      'AT 12-15 12-15',
      'AT 19-25 19-25',
      'AT 25-36 25-36',
      'AT 37-58 37-58',
      'AT 56-88 56-88',
    ]);
  });
});

describe('LockStroke (grey) catalog matches the Paratech brochure', () => {
  it('lists the four published sizes — the third is 36-57, NOT 37-58 (that is AcmeThread)', () => {
    const lk = STRUTS.filter((s) => s.system === 'LockStroke').map((s) => `${s.model} ${s.collapsed}-${s.extended}`);
    expect(lk).toEqual([
      'LK 19-25 19-25',
      'LK 25-36 25-36',
      'LK 36-57 36-57',
      'LK 55-89 55-89',
    ]);
  });
});
