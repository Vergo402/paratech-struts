import { describe, it, expect } from 'vitest';
import { formatElapsed, elapsedLabel, MIN_PLAUSIBLE_START_MS } from './useElapsed';

describe('formatElapsed', () => {
  it('formats HH:MM:SS, zero-padded', () => {
    expect(formatElapsed(0)).toBe('00:00:00');
    expect(formatElapsed(1000)).toBe('00:00:01');
    expect(formatElapsed(61_000)).toBe('00:01:01');
    expect(formatElapsed(2 * 3600_000 + 14 * 60_000 + 37_000)).toBe('02:14:37');
  });

  it('rolls to days past 24h, dropping seconds', () => {
    expect(formatElapsed(25 * 3600_000)).toBe('1d 01:00');
    expect(formatElapsed(2 * 86400_000 + 3 * 3600_000 + 12 * 60_000 + 33_000)).toBe('2d 03:12');
    // Boundary: 23:59:59 stays HH:MM:SS; exactly 24h rolls.
    expect(formatElapsed(86400_000 - 1000)).toBe('23:59:59');
    expect(formatElapsed(86400_000)).toBe('1d 00:00');
  });

  it('floors sub-second and clamps negatives to zero', () => {
    expect(formatElapsed(1999)).toBe('00:00:01');
    expect(formatElapsed(-5000)).toBe('00:00:00');
  });
});

describe('elapsedLabel', () => {
  const now = Date.UTC(2026, 6, 5, 12, 0, 0);

  it('renders — for absent or implausible start times (epoch-0 guard)', () => {
    expect(elapsedLabel(undefined, now)).toBe('—');
    expect(elapsedLabel(0, now)).toBe('—');
    expect(elapsedLabel(MIN_PLAUSIBLE_START_MS - 1, now)).toBe('—');
  });

  it('renders the clock for plausible start times', () => {
    expect(elapsedLabel(now - 3600_000, now)).toBe('01:00:00');
    expect(elapsedLabel(now - 2 * 86400_000, now)).toBe('2d 00:00');
  });
});
