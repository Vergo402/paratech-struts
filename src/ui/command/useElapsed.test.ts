import { describe, it, expect } from 'vitest';
import { formatElapsed } from './useElapsed';

describe('formatElapsed', () => {
  it('formats HH:MM:SS, zero-padded', () => {
    expect(formatElapsed(0)).toBe('00:00:00');
    expect(formatElapsed(1000)).toBe('00:00:01');
    expect(formatElapsed(61_000)).toBe('00:01:01');
    expect(formatElapsed(2 * 3600_000 + 14 * 60_000 + 37_000)).toBe('02:14:37');
  });

  it('rolls hours past 24 (no day wrap)', () => {
    expect(formatElapsed(25 * 3600_000)).toBe('25:00:00');
  });

  it('floors sub-second and clamps negatives to zero', () => {
    expect(formatElapsed(1999)).toBe('00:00:01');
    expect(formatElapsed(-5000)).toBe('00:00:00');
  });
});
