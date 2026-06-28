import { describe, it, expect } from 'vitest';
import { periodOf, periodStatus, OP_AMBER_LEAD_MS } from './period';
import type { OperationPeriod } from '../schema';

const HOUR = 3_600_000;

const periods: OperationPeriod[] = [
  { number: 1, startedAt: 1000 },
  { number: 2, startedAt: 5000, plannedDurationMs: 4000 },
  { number: 3, startedAt: 9000 },
];

describe('periodOf', () => {
  it('returns null for an empty list', () => {
    expect(periodOf(1234, [])).toBeNull();
  });

  it('maps an at inside the first period', () => {
    expect(periodOf(1500, periods)).toBe(1);
  });

  it('returns the boundary period when at lands exactly on a startedAt', () => {
    expect(periodOf(5000, periods)).toBe(2);
    expect(periodOf(9000, periods)).toBe(3);
  });

  it('maps an at between boundaries to the open period', () => {
    expect(periodOf(7000, periods)).toBe(2);
  });

  it('maps an at after the last boundary to the last period', () => {
    expect(periodOf(50_000, periods)).toBe(3);
  });

  it('degrades an at before the first period to the earliest number', () => {
    expect(periodOf(0, periods)).toBe(1);
  });

  it('tolerates an unsorted list', () => {
    const shuffled = [periods[2]!, periods[0]!, periods[1]!];
    expect(periodOf(7000, shuffled)).toBe(2);
    expect(periodOf(500, shuffled)).toBe(1);
  });
});

describe('periodStatus', () => {
  it('no planned length → elapsed only, no progress/amber/rollover', () => {
    const s = periodStatus({ number: 1, startedAt: 0 }, 5 * HOUR);
    expect(s).toEqual({ elapsedMs: 5 * HOUR, remainingMs: null, fraction: null, nearEnd: false, pastEnd: false });
  });

  it('mid-period → fraction tracks, not near end', () => {
    const s = periodStatus({ number: 2, startedAt: 0, plannedDurationMs: 12 * HOUR }, 6 * HOUR);
    expect(s.fraction).toBeCloseTo(0.5);
    expect(s.remainingMs).toBe(6 * HOUR);
    expect(s.nearEnd).toBe(false);
    expect(s.pastEnd).toBe(false);
  });

  it('within the amber lead → nearEnd, not pastEnd', () => {
    const s = periodStatus({ number: 2, startedAt: 0, plannedDurationMs: 12 * HOUR }, 12 * HOUR - OP_AMBER_LEAD_MS + 60_000);
    expect(s.nearEnd).toBe(true);
    expect(s.pastEnd).toBe(false);
  });

  it('at/after the planned end → pastEnd, fraction clamps to 1', () => {
    const s = periodStatus({ number: 2, startedAt: 0, plannedDurationMs: 12 * HOUR }, 13 * HOUR);
    expect(s.pastEnd).toBe(true);
    expect(s.nearEnd).toBe(false);
    expect(s.fraction).toBe(1);
    expect(s.remainingMs).toBeLessThan(0);
  });
});
