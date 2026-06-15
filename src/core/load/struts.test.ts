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
  it('lists all six published models with their collapsed–extended ranges', () => {
    const gold = STRUTS.filter((s) => s.system === 'LongShore').map((s) => `${s.model} ${s.collapsed}-${s.extended}`);
    expect(gold).toEqual([
      'LS 203 26-36',
      'LS 304 36-50',
      'LS 406 48-73',
      'LS 610 72-116',
      'LS 812 92-147',
      'LS 1016 114-198',
    ]);
  });

  it('includes LS 812 (92-147", part 22-796370) — a real size some Paratech sources omit', () => {
    expect(STRUTS.some((s) => s.model === 'LS 812')).toBe(true);
  });
});
