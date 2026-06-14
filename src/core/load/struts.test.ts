import { describe, expect, it } from 'vitest';
import { strutSysKey, sysKeyOf } from './struts';

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
